import { VixsrcProvider } from './src/providers/vixsrc/vixsrc.ts';
async function run() {
  const p = new VixsrcProvider();
  console.log(await p.getMovieSources({ tmdbId: '550', type: 'movie' } as any));
}
run();
