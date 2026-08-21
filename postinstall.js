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
    code = code.replace(/const dedupKey = proxyData\.url;/g, "const dedupKey = proxyData.url + '_' + source.provider.id;");
    
    // Fix error logging to prevent crashes if error is null
    code = code.replace(/catch \{(?:\s*)return null;(?:\s*)\}/g, "catch(err){ return null; }");
    fs.writeFileSync(sourceServiceFile, code);
    console.log("Patched source.service.js successfully.");
}

// Patch kaizoku-core vidcore domain
const vidcoreFile = 'node_modules/kaizoku-core/dist/providers/movies/vidcore.js';
if (fs.existsSync(vidcoreFile)) {
    let code = fs.readFileSync(vidcoreFile, 'utf8');
    code = code.replace(/https:\/\/vidcore\.net/g, 'https://vidcore.net');
    fs.writeFileSync(vidcoreFile, code);
    console.log("Patched kaizoku-core vidcore domain.");
}
