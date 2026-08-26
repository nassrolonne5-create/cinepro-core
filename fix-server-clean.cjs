const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

content = content.replace(
        `                    enabled: true\n                },\n                {\n                    id: "yts",\n                    url: "https://v3-yts.strem.io/manifest.json",\n                    enabled: true\n                }`,
        `                    enabled: true\n                }`
    );
fs.writeFileSync('src/server.ts', content);
