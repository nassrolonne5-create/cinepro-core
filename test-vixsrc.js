import { fetchSources } from 'kaizoku-core/providers/movies/vixsrc';

async function run() {
    try {
        const sources = await fetchSources('278', 'movie');
        console.log("Vixsrc Sources:", JSON.stringify(sources, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
