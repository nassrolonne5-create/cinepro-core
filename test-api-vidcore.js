import { VidcoreProvider } from './dist/providers/vidcore/vidcore.js';
async function run() {
  const vc = new VidcoreProvider();
  const res = await vc.getMovieSources({ type: 'movie', tmdbId: '550', imdbId: 'tt0137523' });
  console.log(JSON.stringify(res, null, 2));
}
run();
