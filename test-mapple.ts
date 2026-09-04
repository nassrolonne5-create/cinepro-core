import { fetchSources } from 'kaizoku-core/providers/movies/mapple';
async function run() {
    try {
        const res = await fetchSources('550', 'movie');
        console.log("Mapple success:", res?.sources?.length);
    } catch(e) {
        console.log("Mapple error:", e.message);
    }
}
run();
