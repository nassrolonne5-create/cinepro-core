import { VidSrcProvider } from './src/providers/vidsrc/vidsrc.ts';
async function run() {
    const p = new VidSrcProvider();
    const res = await p.getMovieSources({ tmdbId: '550', type: 'movie' } as any);
    console.log(JSON.stringify(res, null, 2));
}
run().catch(console.error);
