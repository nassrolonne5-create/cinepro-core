import { OMSSServer } from '@omss/framework';
import path from 'path';

async function run() {
    const server = new OMSSServer({ name: 'test', version: '1.0', port: 3002 });
    await server.getRegistry().discoverProviders(path.join(process.cwd(), 'dist/providers'));
    
    const provs = server.getRegistry().getProviders();
    for (const p of provs) {
        try {
            const res = await p.getMovieSources({ tmdbId: '550', type: 'movie' } as any);
            console.log(p.id, "=>", res.sources.length, "sources");
        } catch(e) {
            console.log(p.id, "=> ERROR");
        }
    }
    process.exit(0);
}
run();
