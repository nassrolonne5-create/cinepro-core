import fs from 'fs';

const sourceServiceFile = 'node_modules/@omss/framework/dist/services/source.service.js';
let code = fs.readFileSync(sourceServiceFile, 'utf8');

// Allow validation to pass non-proxied URLs
code = code.replace(/const data = urlObj\.searchParams\.get\('data'\);\s+if \(!data\)\s+return null;/g, `const data = urlObj.searchParams.get('data');
                            if (!data) return source;`);

// Allow dedup to handle non-proxied URLs
code = code.replace(/const data = urlObj\.searchParams\.get\('data'\);\s+if \(!data\)\s+throw new Error\('Missing data parameter in source URL'\);\s+const proxyData = ProxyService\.decodeProxyData\(data\);/g, `const data = urlObj.searchParams.get('data');
                    let proxyData;
                    if (!data) {
                        proxyData = { url: source.url };
                    } else {
                        proxyData = ProxyService.decodeProxyData(data);
                    }`);

fs.writeFileSync(sourceServiceFile, code);
console.log("Patched source.service.js to allow native embed URLs.");
