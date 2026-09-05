import { fetchSources } from 'kaizoku-core/providers/movies/vidfast';
async function run() {
    try {
        const data = await fetchSources('550', 'movie');
        console.log("Vidfast sources:", data.sources.length);
        console.log("Names:", data.sources.map(s => s.server));
    } catch(e) {
        console.log("Vidfast Error:", e.message);
    }
}
run();
