import { fetchSources } from 'kaizoku-core/providers/movies/vidrock';

async function run() {
    try {
        const sources = await fetchSources('278', 'movie');
        console.log("VidRock Sources:", JSON.stringify(sources, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
