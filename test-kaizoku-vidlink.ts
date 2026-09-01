import { fetchSources } from 'kaizoku-core/providers/movies/vidlink';
async function run() {
    try {
        const res = await fetchSources('550', 'movie');
        console.log(res);
    } catch(e) {
        console.log(e);
    }
}
run();
