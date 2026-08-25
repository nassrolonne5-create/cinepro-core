const fs = require('fs');

// Patch vidnest.js in kaizoku-core
const vidnestFile = 'node_modules/kaizoku-core/dist/providers/movies/vidnest.js';
if (fs.existsSync(vidnestFile)) {
    let code = fs.readFileSync(vidnestFile, 'utf8');
    
    // Rewrite parseStreamData to return all valid streams and downloads
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
    
    // Deduplicate
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

    // Rewrite fetchSources backend mapping
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

    // Fix the result pushing since we now return arrays
    code = code.replace(/if \(r\.status === "fulfilled" && r\.value\) \{\s*sources\.push\(r\.value\);\s*\}/g, `if (r.status === "fulfilled" && r.value) { r.value.forEach(v => sources.push(v)); }`);

    fs.writeFileSync(vidnestFile, code);
}
