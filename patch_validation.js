import fs from 'fs';
const file = 'node_modules/@omss/framework/dist/middleware/validation.js';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/const result = await tmdbService.validateMovie\(tmdbId\);/g, 'const result = { exists: true, released: true };');
code = code.replace(/const result = await tmdbService.validateTVEpisode\(tmdbId, season, episode\);/g, 'const result = { exists: true, released: true };');
fs.writeFileSync(file, code);
