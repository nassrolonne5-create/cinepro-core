import { fetchSources as fetchVidzee } from 'kaizoku-core/providers/movies/vidzee';

async function run() {
    try {
        console.log("\nTesting vidzee...");
        console.log(await fetchVidzee('278', 'movie'));
    } catch(e) { console.log("Vidzee error:", e.message); }
}
run();
