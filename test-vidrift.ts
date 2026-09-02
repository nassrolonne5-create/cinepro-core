import { VidriftProvider } from './src/providers/vidrift/vidrift.js';

async function run() {
    const p = new VidriftProvider();
    const media = { type: 'movie', tmdbId: '550' } as any;
    try {
        const res = await p.getMovieSources(media);
        console.log(JSON.stringify(res, null, 2));
    } catch(e: any) {
        console.error(e.message);
    }
}
run();
