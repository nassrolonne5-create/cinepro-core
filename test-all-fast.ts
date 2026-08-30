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
      const res = await Promise.race([
        p.getMovieSources({ tmdbId: '550', type: 'movie' } as any),
        new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 10000))
      ]);
      console.log(`- Sources: ${(res as any)?.sources?.length || 0}`);
      if ((res as any)?.diagnostics?.length) console.log(`- Diagnostics:`, (res as any).diagnostics);
    } catch (e) {
      console.log(`- Error: ${(e as any).message}`);
    }
  }
  process.exit(0);
}
testAll();
