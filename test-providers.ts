import { VixSrcProvider } from './src/providers/vixsrc/vixsrc.js';
import { IcefyProvider } from './src/providers/icefy/icefy.js';
import type { ProviderMediaObject } from '@omss/framework';

async function testProviders() {
    const vixsrc = new VixSrcProvider();
    const icefy = new IcefyProvider();

    const movie: ProviderMediaObject = {
        tmdbId: '157336', // Interstellar
        title: 'Interstellar',
        year: 2014,
        type: 'movie'
    };

    console.log('Testing VixSrcProvider...');
    const vixsrcRes = await vixsrc.getMovieSources(movie);
    console.log('VixSrc Result:', JSON.stringify(vixsrcRes, null, 2));

    console.log('Testing IcefyProvider...');
    const icefyRes = await icefy.getMovieSources(movie);
    console.log('Icefy Result:', JSON.stringify(icefyRes, null, 2));
}

testProviders().catch(console.error);
