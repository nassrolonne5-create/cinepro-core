import fs from 'fs';
const file = 'node_modules/@omss/framework/dist/services/source.service.js';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/const dedupKey = proxyData\.url;/g, "const dedupKey = proxyData.url + '_' + source.provider.id;");
fs.writeFileSync(file, code);
