const fs = require('fs');
const path = require('path');

const providers = ['cinesu', 'vidfast', 'vidnest', 'vidrock', 'vidup', 'vidzee', 'vixsrc'];

for (const p of providers) {
    const file = `src/providers/${p}/${p}.ts`;
    let code = fs.readFileSync(file, 'utf8');
    
    code = code.replace("readonly enabled = true;", "readonly enabled = true;\n    readonly BASE_URL = '';\n    readonly HEADERS = {};");
    
    fs.writeFileSync(file, code);
}
