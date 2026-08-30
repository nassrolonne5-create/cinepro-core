import { CinesuProvider } from './src/providers/cinesu/cinesu.ts';
const p = new CinesuProvider();
p.getMovieSources({ tmdbId: '550', type: 'movie' } as any).then(res => console.log(JSON.stringify(res, null, 2))).catch(console.error);
