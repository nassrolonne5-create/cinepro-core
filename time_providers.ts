import { ProviderRegistry } from '@omss/framework';
import path from 'path';

async function testAll() {
  const registry = new ProviderRegistry({ proxyBaseUrl: 'http://localhost' });
  await registry.discoverProviders(path.join(process.cwd(), './src/providers/'));
  const providers = registry.getProviders().filter(p => p.enabled);
  console.log(`Found ${providers.length} active providers`);

  const media = { type: 'movie' as const, tmdbId: '550', title: 'Fight Club', releaseYear: '1999', imdbId: 'tt0137523' };

  for (const p of providers) {
    const start = Date.now();
    try {
        const res = await p.getMovieSources(media);
        console.log(`[${Date.now() - start}ms] ${p.id}: ${res?.sources?.length || 0} sources`);
    } catch (e) {
        console.log(`[${Date.now() - start}ms] ${p.id}: Error ${e.message}`);
    }
  }
}
testAll();
