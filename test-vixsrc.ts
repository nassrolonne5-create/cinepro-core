import { VixSrcProvider } from './src/providers/vixsrc/vixsrc.js';
import { ProxyService } from '@omss/framework';
(async () => {
    const vixsrc = new VixSrcProvider();
    const media = { tmdbId: '157336', title: 'Interstellar', year: 2014, type: 'movie' };
    const res = await vixsrc.getMovieSources(media as any);
    const proxyUrl = new URL(res.sources[0].url);
    const data = ProxyService.decodeProxyData(proxyUrl.searchParams.get('data'));
    console.log(data);
    const val = await fetch(data.url, { method: 'GET', headers: data.headers });
    console.log('val ok:', val.ok, val.status);
})();
