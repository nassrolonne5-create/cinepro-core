import { VidSrcProvider } from './dist/providers/vidsrc/vidsrc.js';
import { BaseProvider } from '@omss/framework';
BaseProvider.setProxyConfig({ baseUrl: 'http://localhost:3000' });
const p = new VidSrcProvider();
p.getMovieSources({ tmdbId: '603', type: 'movie' }).then(res => console.log(JSON.stringify(res, null, 2))).catch(console.error);
