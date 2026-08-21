import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const providersDir = path.join(__dirname, 'src', 'providers');

async function run() {
    const folders = fs.readdirSync(providersDir);
    for (const folder of folders) {
        const stat = fs.statSync(path.join(providersDir, folder));
        if (!stat.isDirectory()) continue;
        
        const indexPath = path.join(providersDir, folder, `${folder}.ts`);
        if (fs.existsSync(indexPath)) {
            const content = fs.readFileSync(indexPath, 'utf-8');
            const baseUrlMatch = content.match(/(?:BASE_URL|baseUrl|URL|url)\s*[=:]\s*['"`](https?:\/\/.*?)['"`]/i);
            if (baseUrlMatch) {
                const url = baseUrlMatch[1];
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);
                    const res = await fetch(url, { 
                        method: 'HEAD', 
                        headers: { 
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                            'Accept': '*/*'
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    
                    if (res.ok || res.status === 403 || res.status === 401 || res.status === 405 || res.status === 400 || res.status === 404) { 
                        // I'll print the status, and decide.
                        console.log(`${folder} | ${url} | ${res.status}`);
                    } else {
                        console.log(`${folder} | ${url} | HTTP ${res.status}`);
                    }
                } catch (e) {
                    console.log(`${folder} | ${url} | Error: ${e.message}`);
                }
            } else {
                console.log(`${folder} | No BASE_URL found in code`);
            }
        }
    }
}
run();
