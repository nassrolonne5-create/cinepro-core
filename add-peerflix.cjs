const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

if (!content.includes('peerflix')) {
    content = content.replace(
        `                    enabled: true\n                }`,
        `                    enabled: true\n                },\n                {\n                    id: "peerflix",\n                    url: "https://addon.peerflix.mov/manifest.json",\n                    enabled: true\n                }`
    );
    fs.writeFileSync('src/server.ts', content);
}
