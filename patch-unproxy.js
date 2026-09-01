import fs from 'fs';
const files = [
    'src/providers/vidlink/vidlink.ts',
    'src/providers/vidsrcpro/vidsrcpro.ts',
    'src/providers/embedsu/embedsu.ts',
    'src/providers/cinesu/cinesu.ts',
];

for (const file of files) {
    if (fs.existsSync(file)) {
        let code = fs.readFileSync(file, 'utf8');
        code = code.replace(/url:\s*this\.createProxyUrl\(src\.url,\s*headers\)/g, 'url: src.url');
        fs.writeFileSync(file, code);
        console.log(`Patched ${file}`);
    }
}
