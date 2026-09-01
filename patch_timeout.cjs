const fs = require('fs');
const sourceServiceFile = 'node_modules/@omss/framework/dist/services/source.service.js';
let code = fs.readFileSync(sourceServiceFile, 'utf8');

const targetStr = `const promises = supportedProviders.map(async (provider) => {
            try {
                const startTime = Date.now();
                let result;
                if (type === 'movie') {
                    result = await provider.getMovieSources(media);
                }
                else {
                    result = await provider.getTVSources(media);
                }`;

const replacement = `const promises = supportedProviders.map(async (provider) => {
            try {
                const startTime = Date.now();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Provider timeout exceeded (8s)')), 8000);
                });
                let result = await Promise.race([
                    type === 'movie' ? provider.getMovieSources(media) : provider.getTVSources(media),
                    timeoutPromise
                ]);`;

code = code.replace(targetStr, replacement);
fs.writeFileSync(sourceServiceFile, code);
console.log("Patched timeout");
