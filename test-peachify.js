import { fetchSources } from 'kaizoku-core/providers/movies/peachify';

async function run() {
    try {
        const sources = await fetchSources('278', 'movie');
        console.log("Peachify Sources:", JSON.stringify(sources, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
