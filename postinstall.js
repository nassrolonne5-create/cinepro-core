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
