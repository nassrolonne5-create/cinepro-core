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
    code = code.replace(/async validateSourceUrl\(proxyData, timeoutMs = 3000\) \{/, 'async validateSourceUrl(proxyData, timeoutMs = 3000) {\n        return true;');
    fs.writeFileSync(sourceServiceFile, code);
    console.log("Patched source.service.js successfully.");
}
