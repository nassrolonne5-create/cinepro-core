const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

// Replace the entire stremio config block with nothing
content = content.replace(/,\s*stremio:\s*\{[\s\S]*?\}\s*(?=\}\);)/, '');

fs.writeFileSync('src/server.ts', content);
