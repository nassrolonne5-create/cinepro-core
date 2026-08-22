import { OMSSServer } from '@omss/framework';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const server = new OMSSServer({
        name: "Test",
        version: "1.0",
        tmdb: { apiKey: 'fake' }
    });
    
    const registry = server.getRegistry();
    await registry.discoverProviders(path.join(__dirname, './src/providers/'));
    
    const providers = registry.getAllProviders();
    console.log("Discovered Providers:", providers.map(p => p.id));
}
run();
