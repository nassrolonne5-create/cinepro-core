import { fetchSources } from 'kaizoku-core/providers/movies/vidfast';

async function run() {
    try {
        const sources = await fetchSources('278', 'movie');
        console.log("Vidfast Sources:", JSON.stringify(sources, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
