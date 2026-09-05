const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/providers/*/*.ts');

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix broken template literals
    content = content.replace(/name: this\.name\} \$\{src\.quality \|\| ''\}`\.trim\(\),/g, 'name: `${this.name} ${src.quality || \'\'}`.trim(),');
    
    // Fix vidrift
    content = content.replace(/name: this\.name\} \(\$\{src\.server\}\)` :/g, 'name: this.name,');
    content = content.replace(/name: this\.name\} \$\{data\.sources\.indexOf\(src\) \+ 1\}` :/g, 'name: this.name,');
    
    fs.writeFileSync(file, content);
}
console.log("Done");
