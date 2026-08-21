import { PurStreamProvider } from './dist/providers/purstream/purstream.js';
import { BaseProvider } from '@omss/framework';
BaseProvider.setProxyConfig({ baseUrl: 'http://localhost:3000' });
const p = new PurStreamProvider();
p.getMovieSources({ tmdbId: '550', type: 'movie' }).then(res => console.log(JSON.stringify(res, null, 2))).catch(console.error);
