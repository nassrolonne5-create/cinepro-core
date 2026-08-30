import { VidLinkProvider } from './src/providers/vidlink/vidlink.js';
const p = new VidLinkProvider();
p.getMovieSources({ tmdbId: '550', type: 'movie', title: 'Fight Club' } as any).then(console.log);
