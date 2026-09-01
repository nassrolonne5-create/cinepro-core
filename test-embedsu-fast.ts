import { EmbedSuProvider } from './src/providers/embedsu/embedsu.ts';
async function run() {
  const p = new EmbedSuProvider();
  console.log(await p.getMovieSources({ tmdbId: '550', type: 'movie' } as any));
}
run();
