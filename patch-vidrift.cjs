const fs = require('fs');
let code = fs.readFileSync('src/providers/vidrift/vidrift.ts', 'utf8');

const downloadsLogic = `
                if (data.success && Array.isArray(data.downloads)) {
                    for (const dl of data.downloads) {
                        let rawUrl = dl.url || dl.file || dl.link || '';
                        if (!rawUrl) continue;
                        if (!rawUrl.startsWith('http')) {
                            rawUrl = \`\${this.BASE_URL}/\${rawUrl.replace(/^\\//, '')}\`;
                        }
                        sources.push({
                            url: rawUrl,
                            type: getSourceType(rawUrl, false),
                            quality: typeof dl.quality === 'string' ? dl.quality : 'default',
                            audioTracks: [],
                            provider: {
                                name: \`\${this.name} Download \${sources.length + 1}\`,
                                id: this.id
                            }
                        });
                    }
                }
`;

code = code.replace(/if \(data\.success && Array\.isArray\(data\.streams\)\) \{/, downloadsLogic + '\n                if (data.success && Array.isArray(data.streams)) {');
fs.writeFileSync('src/providers/vidrift/vidrift.ts', code);
