import { VidfastProvider } from './src/providers/vidfast/vidfast.ts';
async function run() {
    const p = new VidfastProvider();
    const res = await p.getMovieSources({ tmdbId: '550', type: 'movie' } as any);
    console.log(JSON.stringify(res, null, 2));
}
run().catch(console.error);
