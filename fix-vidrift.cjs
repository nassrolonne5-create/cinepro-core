const fs = require('fs');
let content = fs.readFileSync('src/providers/vidrift/vidrift.ts', 'utf8');
content = content.replace('readonly enabled = false;', 'readonly enabled = true;');
fs.writeFileSync('src/providers/vidrift/vidrift.ts', content);
