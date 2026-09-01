import { VidLinkProvider } from './src/providers/vidlink/vidlink.js';
import { EmbedSuProvider } from './src/providers/embedsu/embedsu.js';
import { VidriftProvider } from './src/providers/vidrift/vidrift.js';

async function run() {
    const media = { type: 'movie' as const, tmdbId: '550', title: 'Fight Club', releaseYear: '1999', imdbId: 'tt0137523' };
    
    console.log("--- VidLink ---");
    const vl = new VidLinkProvider();
    console.log(await vl.getMovieSources(media));

    console.log("--- EmbedSU ---");
    const esu = new EmbedSuProvider();
    console.log(await esu.getMovieSources(media));

    console.log("--- VidRift ---");
    const vr = new VidriftProvider();
    console.log(await vr.getMovieSources(media));
}
run();
