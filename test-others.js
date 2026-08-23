import { fetchSources as fetchCinesu } from 'kaizoku-core/providers/movies/cinesu';
import { fetchSources as fetchVidvault } from 'kaizoku-core/providers/movies/vidvault';
import { fetchSources as fetchVidup } from 'kaizoku-core/providers/movies/vidup';

async function run() {
    try {
        console.log("Testing cinesu (Vidx)...");
        console.log(await fetchCinesu('278', 'movie'));
    } catch(e) { console.log("Cinesu error:", e.message); }

    try {
        console.log("\nTesting vidvault (Veil)...");
        console.log(await fetchVidvault('278', 'movie'));
    } catch(e) { console.log("Vidvault error:", e.message); }

    try {
        console.log("\nTesting vidup (Cargo)...");
        console.log(await fetchVidup('278', 'movie'));
    } catch(e) { console.log("Vidup error:", e.message); }
}
run();
