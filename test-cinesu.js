import { fetchSources as fetchCine } from 'kaizoku-core/providers/movies/cinesu';
import { fetchSources as fetchVidnest } from 'kaizoku-core/providers/movies/vidnest';

async function run() {
  console.log("CineSU:")
  try {
    const r1 = await fetchCine('550', 'movie');
    console.log(JSON.stringify(r1, null, 2));
  } catch(e) { console.error(e) }

  console.log("VidNest:")
  try {
    const r2 = await fetchVidnest('550', 'movie');
    console.log(JSON.stringify(r2, null, 2));
  } catch(e) { console.error(e) }
}
run();
