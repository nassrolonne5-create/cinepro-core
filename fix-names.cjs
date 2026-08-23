const fs = require('fs');
const path = require('path');

const providersDir = path.join(__dirname, 'src', 'providers');
const dirs = fs.readdirSync(providersDir);

for (const dir of dirs) {
    const tsFile = path.join(providersDir, dir, `${dir}.ts`);
    if (fs.existsSync(tsFile)) {
        let content = fs.readFileSync(tsFile, 'utf8');
        
        // Find: name: this.name,
        // Replace: name: data.sources.length > 1 ? `${this.name} ${data.sources.indexOf(src) + 1}` : this.name,
        // Actually, we must be sure the loop variable is `src` and the array is `data.sources`.
        // Let's just do a simpler string replacement for name: this.name.
        // What if we do: 
        content = content.replace(/name: this\.name/g, 'name: data.sources.length > 1 ? `${this.name} ${data.sources.indexOf(src) + 1}` : this.name');
        
        fs.writeFileSync(tsFile, content);
    }
}
