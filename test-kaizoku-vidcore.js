import { fetchSources } from 'kaizoku-core/dist/providers/movies/vidcore.js';

async function run() {
    try {
        const sources = await fetchSources('550', 'movie');
        console.log("Sources:", sources);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
