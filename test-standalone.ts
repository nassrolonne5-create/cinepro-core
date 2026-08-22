import { VidcoreProvider } from './src/providers/vidcore/vidcore.ts';
import { VidfastProvider } from './src/providers/vidfast/vidfast.ts';

async function run() {
    const media = { tmdbId: "552", type: "movie", s: undefined, e: undefined };
    
    console.log("Testing Vidcore...");
    const vidcore = new VidcoreProvider();
    const vcRes = await vidcore.getMovieSources(media as any);
    console.log("Vidcore Sources:", vcRes.sources?.length);
    
    console.log("Testing Vidfast...");
    const vidfast = new VidfastProvider();
    const vfRes = await vidfast.getMovieSources(media as any);
    console.log("Vidfast Sources:", vfRes.sources?.length);
}
run();
