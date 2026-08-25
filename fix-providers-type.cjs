const fs = require('fs');
const path = require('path');
const providersDir = path.join(__dirname, 'src', 'providers');

const dirs = fs.readdirSync(providersDir);
for (const dir of dirs) {
    const file = path.join(providersDir, dir, `${dir}.ts`);
    if (fs.existsSync(file)) {
        let code = fs.readFileSync(file, 'utf8');
        
        if (code.includes("type: src.isM3U8 || src.url.includes('.m3u8') ? 'hls' : 'mp4'")) {
            if (!code.includes("import { getSourceType }")) {
                code = `import { getSourceType } from '../../utils/streamType.js';\n` + code;
            }
            code = code.replace(/type: src\.isM3U8 \|\| src\.url\.includes\('\.m3u8'\) \? 'hls' : 'mp4'/g, "type: getSourceType(src.url, src.isM3U8)");
            fs.writeFileSync(file, code);
        } else if (code.includes("type: isM3U8 ? 'hls' : 'mp4'")) {
            if (!code.includes("import { getSourceType }")) {
                code = `import { getSourceType } from '../../utils/streamType.js';\n` + code;
            }
            code = code.replace(/type: isM3U8 \? 'hls' : 'mp4'/g, "type: getSourceType(rawUrl, isM3U8)");
            fs.writeFileSync(file, code);
        }
    }
}
