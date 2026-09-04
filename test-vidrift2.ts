import { VidriftProvider } from './src/providers/vidrift/vidrift.js';
async function run() {
    const p = new VidriftProvider();
    const res = await p.getMovieSources({ tmdbId: '550', type: 'movie' } as any);
    console.log(JSON.stringify(res, null, 2));
}
run().catch(console.error);
