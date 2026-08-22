import { VidcoreProvider } from './src/providers/vidcore/vidcore.ts';
import { VidfastProvider } from './src/providers/vidfast/vidfast.ts';

async function run() {
    const media = { tmdbId: "550", type: "movie", s: undefined, e: undefined };
    
    console.log("Testing Vidcore...");
    const vidcore = new VidcoreProvider();
    const vcRes = await vidcore.getMovieSources(media as any);
    console.log("Vidcore Sources:", JSON.stringify(vcRes.sources, null, 2));
    
    console.log("Testing Vidfast...");
    const vidfast = new VidfastProvider();
    const vfRes = await vidfast.getMovieSources(media as any);
    console.log("Vidfast Sources:", JSON.stringify(vfRes.sources, null, 2));
}
run();
