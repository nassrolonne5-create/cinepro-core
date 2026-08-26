const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

// Re-enable torrentio
content = content.replace(
`                    id: "torrentio",
                    url: "https://torrentio.strem.fun/manifest.json",
                    enabled: false`,
`                    id: "torrentio",
                    url: "https://torrentio.strem.fun/manifest.json",
                    enabled: true`
);

// Check if yts is there, if not add it
if (!content.includes('"yts"')) {
    content = content.replace(
        `                    enabled: true\n                }`,
        `                    enabled: true\n                },\n                {\n                    id: "yts",\n                    url: "https://v3-yts.strem.io/manifest.json",\n                    enabled: true\n                }`
    );
}

fs.writeFileSync('src/server.ts', content);
