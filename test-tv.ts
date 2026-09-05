import { fetchSources as fetchVidfast } from 'kaizoku-core/providers/movies/vidfast';
import { fetchSources as fetchVidnest } from 'kaizoku-core/providers/movies/vidnest';

async function run() {
    try {
        console.log("Testing TV show (Breaking Bad S01E01)...");
        const vf = await fetchVidfast('1396', 'tv', 1, 1);
        console.log("VidFast TV:", vf?.sources?.length);
    } catch(e) {
        console.log("VidFast TV Error:", e.message);
    }
    
    try {
        const vs = await fetchVidnest('1396', 'tv', 1, 1);
        console.log("VidNest TV:", vs?.sources?.length);
    } catch(e) {
        console.log("VidNest TV Error:", e.message);
    }
}
run();
