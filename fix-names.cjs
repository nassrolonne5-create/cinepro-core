const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/providers/*/*.ts');

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Extract the ID
    const idMatch = content.match(/readonly id = '([^']+)'/);
    if (!idMatch) continue;
    
    let realName = idMatch[1];
    
    // Convert id like "vidrock" to "VidRock" or "vidnest" to "VidNest", etc.
    // Or just use the raw id but TitleCased.
    if (realName === 'cinesu') realName = 'CineSu';
    else if (realName === 'vidnest') realName = 'VidNest';
    else if (realName === 'vidrock') realName = 'VidRock';
    else if (realName === 'vidup') realName = 'VidUp';
    else if (realName === 'vidzee') realName = 'VidZee';
    else if (realName === 'vixsrc') realName = 'VixSrc';
    else if (realName === 'vidfast') realName = 'VidFast';
    else if (realName === 'vidsrc') realName = 'VidSrc';
    else if (realName === 'vidrift') realName = 'VidRift';
    else if (realName === 'vidvault') realName = 'VidVault';
    else if (realName === 'vidlink') realName = 'VidLink';
    
    // Replace the name field
    content = content.replace(/readonly name = '([^']+)'/, `readonly name = '${realName}'`);
    
    // Also remove the dynamic suffix stuff entirely if it still exists.
    content = content.replace(/name: .* \? .* : this\.name/g, 'name: this.name');
    content = content.replace(/name: .* \? .* : data\.sources\.length > 1 \? .* : this\.name/g, 'name: this.name');
    content = content.replace(/name: src\.server \? `\$\{this\.name\} \(\$\{src\.server\}\)` : this\.name/g, 'name: this.name');
    content = content.replace(/name: \(src as any\)\.server \? `\$\{this\.name\} \(\$\{\(src as any\)\.server\}\)` : this\.name/g, 'name: this.name');
    // More generic replacement for provider name assignments:
    content = content.replace(/name: (?:(?!\bthis\.name\b)[^,])+this\.name/g, 'name: this.name');
    
    fs.writeFileSync(file, content);
}
console.log("Done fixing names.");
