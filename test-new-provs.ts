import { OpstreamProvider } from './src/providers/opstream/opstream.ts';
import { VidcoreProvider } from './src/providers/vidcore/vidcore.ts';
import { PeachifyProvider } from './src/providers/peachify/peachify.ts';

async function testProvider(name: string, ProviderClass: any) {
    try {
        const p = new ProviderClass();
        const res = await p.getMovieSources({ tmdbId: '550', type: 'movie' } as any);
        console.log(`${name}: ${res.sources.length} sources`);
        if (res.sources.length === 0) {
            console.log(`${name} empty response, diagnostic maybe?`, res.diagnostics);
        }
    } catch (e) {
        console.log(`${name} threw error:`, e.message);
    }
}

async function run() {
    await testProvider('OpStream', OpstreamProvider);
    await testProvider('VidCore', VidcoreProvider);
    await testProvider('Peachify', PeachifyProvider);
}
run();
