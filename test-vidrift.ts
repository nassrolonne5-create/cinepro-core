import { VidriftProvider } from './src/providers/vidrift/vidrift.js';

async function test() {
    const provider = new VidriftProvider();
    try {
        const res = await provider.getMovieSources({ tmdbId: '550', type: 'movie', title: 'Fight Club' } as any);
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
