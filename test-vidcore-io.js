import { fetchSources } from 'kaizoku-core/providers/movies/vidcore';
async function run() {
  try {
    const vc = await fetchSources('550', 'movie');
    console.log("Vidcore Sources:", vc.sources);
  } catch (e) {
    console.error("Vidcore Error:", e);
  }
}
run();
