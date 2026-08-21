import { fetchSources as fetchVidfast } from 'kaizoku-core/providers/movies/vidfast';
import { fetchSources as fetchVidup } from 'kaizoku-core/providers/movies/vidup';
import { fetchSources as fetchPurstream } from 'kaizoku-core/providers/movies/purstream';
import { fetchSources as fetchVidzee } from 'kaizoku-core/providers/movies/vidzee';

async function run() {
  const tmdb = '550'; // Fight Club
  
  for (const [name, fn] of Object.entries({
    vidfast: fetchVidfast,
    vidup: fetchVidup,
    purstream: fetchPurstream,
    vidzee: fetchVidzee
  })) {
    try {
      console.log(`\n--- ${name} ---`);
      const res = await fn(tmdb, 'movie');
      console.log(JSON.stringify(res, null, 2).substring(0, 300));
    } catch(e) {
      console.error(`Failed ${name}: ${e.message}`);
    }
  }
}
run();
