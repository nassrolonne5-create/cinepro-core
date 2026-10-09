import fs from 'fs';

// Patch kaizoku-core package.json exports to properly declare TypeScript declaration types for subpaths
const kaizokuPkgFile = 'node_modules/kaizoku-core/package.json';
if (fs.existsSync(kaizokuPkgFile)) {
    try {
        const pkg = JSON.parse(fs.readFileSync(kaizokuPkgFile, 'utf8'));
        pkg.exports["./providers/*"] = {
            "types": "./dist/providers/*.d.ts",
            "import": "./dist/providers/*.js",
            "default": "./dist/providers/*.js"
        };
        fs.writeFileSync(kaizokuPkgFile, JSON.stringify(pkg, null, 2));
        console.log("Patched kaizoku-core package.json exports.");
    } catch(e) {}
}

const kaizokuIndexDts = 'node_modules/kaizoku-core/dist/index.d.ts';
if (fs.existsSync(kaizokuIndexDts)) {
    let code = fs.readFileSync(kaizokuIndexDts, 'utf8');
    const toAdd = [];
    if (!code.includes('rivestream')) toAdd.push('export * as rivestream from "./providers/movies/rivestream.js";');
    if (!code.includes('vidgod')) toAdd.push('export * as vidgod from "./providers/movies/vidgod.js";');
    if (!code.includes('lmscript')) toAdd.push('export * as lmscript from "./providers/movies/lmscript.js";');
    if (toAdd.length > 0) {
        code += '\n' + toAdd.join('\n') + '\n';
        fs.writeFileSync(kaizokuIndexDts, code);
        console.log("Patched kaizoku-core index.d.ts with missing exports.");
    }
}
const kaizokuIndexJs = 'node_modules/kaizoku-core/dist/index.js';
if (fs.existsSync(kaizokuIndexJs)) {
    let code = fs.readFileSync(kaizokuIndexJs, 'utf8');
    const toAdd = [];
    if (!code.includes('rivestream')) toAdd.push('export * as rivestream from "./providers/movies/rivestream.js";');
    if (!code.includes('vidgod')) toAdd.push('export * as vidgod from "./providers/movies/vidgod.js";');
    if (!code.includes('lmscript')) toAdd.push('export * as lmscript from "./providers/movies/lmscript.js";');
    if (toAdd.length > 0) {
        code += '\n' + toAdd.join('\n') + '\n';
        fs.writeFileSync(kaizokuIndexJs, code);
        console.log("Patched kaizoku-core index.js with missing exports.");
    }
}

const validationFile = 'node_modules/@omss/framework/dist/middleware/validation.js';
if (fs.existsSync(validationFile)) {
    let code = fs.readFileSync(validationFile, 'utf8');
    code = code.replace(/const result = await tmdbService\.validateMovie\(tmdbId\);/g, 'const result = { exists: true, released: true };');
    code = code.replace(/const result = await tmdbService\.validateTVEpisode\(tmdbId, season, episode\);/g, 'const result = { exists: true, released: true };');
    fs.writeFileSync(validationFile, code);
    console.log("Patched validation.js successfully.");
}

// Patch kaizoku-core vidrock to use updated vidrock.to domain
const vidrockFile = 'node_modules/kaizoku-core/dist/providers/movies/vidrock.js';
if (fs.existsSync(vidrockFile)) {
    let code = fs.readFileSync(vidrockFile, 'utf8');
    if (code.includes('vidrock.ru')) {
        code = code.replace(/vidrock\.ru/g, 'vidrock.to');
        fs.writeFileSync(vidrockFile, code);
        console.log("Patched kaizoku-core vidrock domain to vidrock.to.");
    }
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
    // Allow native subtitle URLs in SourceService
    code = code.replace(/r\.subtitles\.forEach\(\(subtitle\) => \{[\s\S]*?console\.warn\(`\[SourceService\] Failed to decode subtitle URL: \$\{subtitle\.url\}`, error\);[\s\S]*?\}\);/, `r.subtitles.forEach((subtitle) => {
                try {
                    let subKey = subtitle.url;
                    try {
                        const urlObj = new URL(subtitle.url);
                        const data = urlObj.searchParams.get('data');
                        if (data) {
                            const proxyData = ProxyService.decodeProxyData(data);
                            subKey = proxyData.url;
                        }
                    } catch {}
                    if (!allSubtitlesMap.has(subKey)) {
                        allSubtitlesMap.set(subKey, subtitle);
                    }
                }
                catch (error) {
                    if (!allSubtitlesMap.has(subtitle.url)) {
                        allSubtitlesMap.set(subtitle.url, subtitle);
                    }
                }
            });`);
    fs.writeFileSync(sourceServiceFile, code);
    console.log("Patched source.service.js to allow native embed and subtitle URLs.");
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
            const uLower = clean.toLowerCase();
            if (uLower.includes('goodstream.cc') || uLower.includes('tiktoks') || uLower.includes('animanga') || uLower.includes('aoneroom') || uLower.includes('boomchick') || uLower.includes('bigtits')) return;
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
    
    // Replace any existing timeout with 12s
    if (code.includes('Provider timeout exceeded')) {
        code = code.replace(/setTimeout\(\(\) => reject\(new Error\('Provider timeout exceeded \([^)]+\)'\)\), \d+\);/g, "setTimeout(() => reject(new Error('Provider timeout exceeded (12s)')), 12000);");
        code = code.replace(/const urlObj = new URL\(source\.url\);/g, "const urlObj = new URL(source.url, 'http://localhost:3000');");
        code = code.replace(/catch\(err\)\{\s*return null;\s*\}/g, "catch(err){ return source; }");
        fs.writeFileSync(sourceServiceFile, code);
        console.log("Patched source.service.js to update provider timeout to 12s and handle relative proxy URLs.");
    } else {
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
                    setTimeout(() => reject(new Error('Provider timeout exceeded (12s)')), 12000);
                });
                let result = await Promise.race([
                    type === 'movie' ? provider.getMovieSources(media) : provider.getTVSources(media),
                    timeoutPromise
                ]);`;

        code = code.replace(targetStr, replacement);
        fs.writeFileSync(sourceServiceFile, code);
        console.log("Patched source.service.js to add global 12-second provider timeout.");
    }
}

// Patch OMSS framework provider-registry.js to support custom and tsx providers
const registryFile = 'node_modules/@omss/framework/dist/providers/provider-registry.js';
if (fs.existsSync(registryFile)) {
    let code = fs.readFileSync(registryFile, 'utf8');
    if (!code.includes('ExportedClass.name.endsWith')) {
        code = code.replace(
            'if (BaseProvider.prototype.isPrototypeOf(ExportedClass.prototype)) {',
            'if (BaseProvider.prototype.isPrototypeOf(ExportedClass.prototype) || ExportedClass.name.endsWith("Provider") || (ExportedClass.prototype && typeof ExportedClass.prototype.getMovieSources === "function")) {'
        );
        fs.writeFileSync(registryFile, code);
        console.log("Patched provider-registry.js for robust class detection.");
    }
}

// Patch OMSS framework proxy.service.js to prevent binary mangling of .html / .txt video chunks and strip fake PNG steganography headers
const proxyServiceFile = 'node_modules/@omss/framework/dist/services/proxy.service.js';
if (fs.existsSync(proxyServiceFile)) {
    let code = fs.readFileSync(proxyServiceFile, 'utf8');
    if (!code.includes('fake PNG')) {
        code = code.replace(
            "if (this.isManifestFile(contentType, proxyData.url)) {",
            `const isPlaylist = (contentType && /application\\/(vnd\\.apple\\.mpegurl|x-mpegurl|dash\\+xml)/i.test(contentType)) ||
            (responseData.length >= 7 && (responseData.subarray(0, 7).toString('utf8').startsWith('#EXT') || responseData.subarray(0, 20).toString('utf8').includes('<MPD') || responseData.subarray(0, 20).toString('utf8').includes('<?xml')));
        if (isPlaylist && !/\\.(vtt|srt|ass|ssa|ttml)(\\?.*)?$/i.test(proxyData.url)) {
            const manifestContent = responseData.toString('utf-8');
            if (manifestContent.includes('WRONG HASH') || manifestContent.includes('Link expired') || manifestContent.includes('Invalid link')) {
                throw new OMSSError('UPSTREAM_ERROR', 'Upstream link expired or invalid token', 404, { url: proxyData.url });
            }
            const rewrittenContent = this.rewriteManifest(manifestContent, proxyData.url, proxyData.headers);
            responseData = Buffer.from(rewrittenContent, 'utf-8');
        } else {
            // Strip artificial 120-byte fake PNG steganography headers (e.g. tik.1x2.space) so MPEG-TS sync byte (0x47) aligns at offset 0
            if (responseData.length > 120 &&
                responseData[0] === 0x89 && responseData[1] === 0x50 && responseData[2] === 0x4E && responseData[3] === 0x47 &&
                responseData[120] === 0x47) {
                responseData = responseData.subarray(120);
            }
        }
        
        let outContentType = contentType || this.getMimeType(proxyData.url);
        if (responseData.length > 0 && responseData[0] === 0x47) {
            outContentType = 'video/mp2t';
        }
        if (false) {`
        );
        code = code.replace(
            "contentType: contentType || this.getMimeType(proxyData.url),",
            "contentType: (typeof outContentType !== 'undefined' ? outContentType : (contentType || this.getMimeType(proxyData.url))),"
        );
        fs.writeFileSync(proxyServiceFile, code);
        console.log("Patched proxy.service.js to prevent binary video mangling and strip fake PNG headers.");
    }
}


