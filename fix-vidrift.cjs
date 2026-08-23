const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/providers/vidrift/vidrift.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/provider: this/g, "provider: {\n                                name: `${this.name} ${sources.length + 1}`,\n                                id: this.id\n                            }");

fs.writeFileSync(file, code);
