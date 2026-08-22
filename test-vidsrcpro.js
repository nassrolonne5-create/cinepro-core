import { fetchSources as vidlink } from 'kaizoku-core/providers/movies/vidlink';
async function run() {
    try {
        const res = await vidlink('550', 'movie');
        console.log(`vidsrcpro: ${res.sources.length} sources`);
    } catch (e) {
        console.log(`vidsrcpro: Failed - ${e.message}`);
    }
}
run();
