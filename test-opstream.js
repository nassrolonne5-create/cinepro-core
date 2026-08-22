import { fetchSources as opstream } from 'kaizoku-core/providers/movies/opstream';
async function run() {
    try {
        const res = await opstream('550', 'movie');
        console.log(`opstream: ${res.sources.length} sources`);
    } catch (e) {
        console.log(`opstream: Failed - ${e.message}`);
    }
}
run();
