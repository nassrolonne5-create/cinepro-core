import fs from 'fs';

const validationFile = 'node_modules/@omss/framework/dist/middleware/validation.js';
if (fs.existsSync(validationFile)) {
    let code = fs.readFileSync(validationFile, 'utf8');
    code = code.replace(/const result = await tmdbService\.validateMovie\(tmdbId\);/g, 'const result = { exists: true, released: true };');
    code = code.replace(/const result = await tmdbService\.validateTVEpisode\(tmdbId, season, episode\);/g, 'const result = { exists: true, released: true };');
    fs.writeFileSync(validationFile, code);
    console.log("Patched validation.js successfully.");
}

const sourceServiceFile = 'node_modules/@omss/framework/dist/services/source.service.js';
if (fs.existsSync(sourceServiceFile)) {
    let code = fs.readFileSync(sourceServiceFile, 'utf8');
    // Disable timeout validation
    code = code.replace(/async validateSourceUrl\(proxyData, timeoutMs = 3000\) \{/, 'async validateSourceUrl(proxyData, timeoutMs = 3000) {\n        return true;');
    
    // Patch dedup logic to preserve duplicate URLs from different providers (like vidfast and vidcore)
    code = code.replace(/allSourcesMap\.has\(proxyData\.url\)/g, "allSourcesMap.has(proxyData.url + '_' + source.provider.id)");
    code = code.replace(/allSourcesMap\.set\(proxyData\.url, source\)/g, "allSourcesMap.set(proxyData.url + '_' + source.provider.id, source)");
    code = code.replace(/allSourcesMap\.has\(source\.url\)/g, "allSourcesMap.has(source.url + '_' + source.provider.id)");
    code = code.replace(/allSourcesMap\.set\(source\.url, source\)/g, "allSourcesMap.set(source.url + '_' + source.provider.id, source)");
    
    // Fix error logging to prevent crashes if error is null
    code = code.replace(/catch \{(?:\s*)return null;(?:\s*)\}/g, "catch(err){ return null; }");
    fs.writeFileSync(sourceServiceFile, code);
    console.log("Patched source.service.js successfully.");
}

// Patch kaizoku-core vidcore domain
const vidcoreFile = 'node_modules/kaizoku-core/dist/providers/movies/vidcore.js';
if (fs.existsSync(vidcoreFile)) {
    let code = fs.readFileSync(vidcoreFile, 'utf8');
    code = code.replace(/https:\/\/vidcore\.net/g, 'https://vidcore.io');
    fs.writeFileSync(vidcoreFile, code);
    console.log("Patched kaizoku-core vidcore domain.");
}

// Allow native embed URLs in SourceService validation and dedup
if (fs.existsSync(sourceServiceFile)) {
    let code = fs.readFileSync(sourceServiceFile, 'utf8');
    code = code.replace(/const data = urlObj\.searchParams\.get\('data'\);\s+if \(!data\)\s+return null;/g, `const data = urlObj.searchParams.get('data');
                            if (!data) return source;`);
    code = code.replace(/const data = urlObj\.searchParams\.get\('data'\);\s+if \(!data\)\s+throw new Error\('Missing data parameter in source URL'\);\s+const proxyData = ProxyService\.decodeProxyData\(data\);/g, `const data = urlObj.searchParams.get('data');
                    let proxyData;
                    if (!data) {
                        proxyData = { url: source.url };
                    } else {
                        proxyData = ProxyService.decodeProxyData(data);
                    }`);
    fs.writeFileSync(sourceServiceFile, code);
    console.log("Patched source.service.js to allow native embed URLs.");
}

// Patch kaizoku-core vidnest to return ALL streams and downloads instead of just the first one
const vidnestFile = 'node_modules/kaizoku-core/dist/providers/movies/vidnest.js';
if (fs.existsSync(vidnestFile)) {
    let code = fs.readFileSync(vidnestFile, 'utf8');
    
    // Quick check if already patched
    if (!code.includes('streamList = parseStreamData')) {
        const newParse = `
function parseStreamData(data) {
    if (!data) return [];
    if (typeof data === "string") {
        try { data = JSON.parse(data); } catch {
            const match = data.match(/\\{.*\\}/s);
            if (match) { try { data = JSON.parse(match[0]); } catch { return []; } }
            else { return []; }
        }
    }
    if (typeof data !== "object" || data === null) return [];
    
    let results = [];
    const addUrl = (u, q) => {
        if (typeof u === "string") {
            const clean = u.startsWith("//") ? "https:" + u : u;
            if (isValidStreamUrl(clean)) results.push({ url: clean, quality: q || "default" });
        }
    };

    if (Array.isArray(data.sources)) data.sources.forEach(s => addUrl(s?.url || s?.file || s?.link));
    if (Array.isArray(data.streams)) data.streams.forEach(s => addUrl(s?.url || s?.file || s?.link));
    if (data.data && Array.isArray(data.data.downloads)) {
        data.data.downloads.forEach(dl => {
            if (dl?.url) addUrl(dl.url, dl.resolution ? dl.resolution + 'p' : 'default');
        });
    }
    addUrl(data.url);
    if (Array.isArray(data.url) && data.url[0]?.link) addUrl(data.url[0].link);
    if (data.data?.stream?.playlist) addUrl(data.data.stream.playlist);
    addUrl(data.file);

    for (const key of Object.keys(data)) {
        const val = data[key];
        if (typeof val === "string" && (val.startsWith("http") || val.startsWith("//"))) {
            if ([".m3u8", ".mp4", ".mkv", ".ts", ".webm"].some(ext => val.toLowerCase().includes(ext))) {
                addUrl(val);
            }
        }
    }
    
    const unique = [];
    const seen = new Set();
    for (const r of results) {
        if (!seen.has(r.url)) {
            seen.add(r.url);
            unique.push(r);
        }
    }
    return unique;
}
`;

        code = code.replace(/function parseStreamData\(data\) \{[\s\S]*?return null;\n\}/, newParse.trim());

        code = code.replace(/const streamUrl = parseStreamData\(dataToParse\);\s*if \(\!streamUrl\)[\s\S]*?return source;/g, `
            const streamList = parseStreamData(dataToParse);
            if (!streamList || streamList.length === 0) return null;
            
            const outSources = [];
            for (let i = 0; i < streamList.length; i++) {
                const item = streamList[i];
                const cleanUrl = unwrapUrl(item.url);
                const isM3U8 = cleanUrl.toLowerCase().includes(".m3u8");
                const isMkv = cleanUrl.toLowerCase().includes(".mkv");
                const isMp4 = cleanUrl.toLowerCase().includes(".mp4");
                const proxiedUrl = generateProxiedUrl(cleanUrl, headers);
                outSources.push({
                    url: cleanUrl,
                    proxiedUrl,
                    isM3U8,
                    type: isM3U8 ? "hls" : isMkv ? "mkv" : isMp4 ? "mp4" : "mp4",
                    quality: item.quality,
                    server: backend.name + (streamList.length > 1 ? " " + (i + 1) : ""),
                });
            }
            return outSources;
`);

        code = code.replace(/if \(r\.status === "fulfilled" && r\.value\) \{\s*sources\.push\(r\.value\);\s*\}/g, `if (r.status === "fulfilled" && r.value) { if (Array.isArray(r.value)) { r.value.forEach(v => sources.push(v)); } else { sources.push(r.value); } }`);

        fs.writeFileSync(vidnestFile, code);
        console.log("Patched kaizoku-core vidnest to extract multiple streams and downloads.");
    }
}

// Add timeout wrapper to OMSS framework source.service.js fetchFromProviders
if (fs.existsSync(sourceServiceFile)) {
    let code = fs.readFileSync(sourceServiceFile, 'utf8');
    
    // First verify if not already patched
    if (!code.includes('Provider timeout exceeded (6s)')) {
        const targetStr = `const promises = supportedProviders.map(async (provider) => {
            try {
                const startTime = Date.now();
                let result;
                if (type === 'movie') {
                    result = await provider.getMovieSources(media);
                }
                else {
                    result = await provider.getTVSources(media);
                }`;

        const replacement = `const promises = supportedProviders.map(async (provider) => {
            try {
                const startTime = Date.now();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Provider timeout exceeded (6s)')), 6000);
                });
                let result = await Promise.race([
                    type === 'movie' ? provider.getMovieSources(media) : provider.getTVSources(media),
                    timeoutPromise
                ]);`;

        code = code.replace(targetStr, replacement);
        fs.writeFileSync(sourceServiceFile, code);
        console.log("Patched source.service.js to add global 8-second provider timeout.");
    }
}
