import { ProviderRegistry } from '@omss/framework';
import path from 'path';

async function testAll() {
  const registry = new ProviderRegistry({ proxyBaseUrl: 'http://localhost' });
  await registry.discoverProviders(path.join(process.cwd(), './src/providers/'));
  const providers = registry.getProviders();
  console.log(`Found ${providers.length} providers`);
  
  for (const p of providers) {
    console.log(`\nTesting ${p.id}...`);
    try {
      const res = await p.getMovieSources({ tmdbId: '550', type: 'movie' } as any);
      console.log(`- Sources: ${res?.sources?.length || 0}`);
      if (res?.diagnostics?.length) console.log(`- Diagnostics:`, res.diagnostics);
    } catch (e) {
      console.log(`- Error: ${e.message}`);
    }
  }
}
testAll();
