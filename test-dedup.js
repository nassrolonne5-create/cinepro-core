import { fetchSources as fetchVidfast } from 'kaizoku-core/providers/movies/vidfast';
import { fetchSources as fetchVidcore } from 'kaizoku-core/providers/movies/vidcore';
import { fetchSources as fetchVidsrc } from 'kaizoku-core/providers/movies/vidsrc';

async function run() {
  const tmdb = '550';
  const vf = await fetchVidfast(tmdb, 'movie');
  const vc = await fetchVidcore(tmdb, 'movie');
  const vs = await fetchVidsrc(tmdb, 'movie');
  
  console.log("Vidfast:");
  vf.sources.forEach(s => console.log(s.url.substring(0, 50)));
  console.log("Vidcore:");
  vc.sources.forEach(s => console.log(s.url.substring(0, 50)));
  console.log("Vidsrc:");
  vs.sources.forEach(s => console.log(s.url.substring(0, 50)));
}
run();
