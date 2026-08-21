import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mediaMovie = {
    type: 'movie',
    tmdbId: '27205',
    imdbId: 'tt1375666',
    title: 'Inception',
    year: 2010
};

const mediaTv = {
    type: 'tv',
    tmdbId: '1396',
    imdbId: 'tt0903747',
    title: 'Breaking Bad',
    year: 2008,
    s: 1,
    e: 1
};

async function testProviders() {
    const providersDir = path.join(__dirname, 'src', 'providers');
    const folders = fs.readdirSync(providersDir);
    
    for (const folder of folders) {
        const stat = fs.statSync(path.join(providersDir, folder));
        if (!stat.isDirectory()) continue;
        
        const indexPath = path.join(providersDir, folder, `${folder}.ts`);
        if (fs.existsSync(indexPath)) {
            try {
                // Use absolute file URL to avoid import issues
                const module = await import(pathToFileURL(indexPath).href);
                // Find the class extending BaseProvider (or having getMovieSources)
                const ProviderClass = Object.values(module).find((val: any) => typeof val === 'function' && val.prototype && val.prototype.getMovieSources);
                
                if (ProviderClass) {
                    const provider = new (ProviderClass as any)();
                    console.log(`\nTesting ${provider.name || folder}...`);
                    
                    try {
                        const movieResult = await provider.getMovieSources(mediaMovie);
                        const hasMovie = movieResult && movieResult.sources && movieResult.sources.length > 0;
                        console.log(`  Movie: ${hasMovie ? 'OK' : 'FAIL'}`);
                        if (!hasMovie && movieResult?.diagnostics) console.log('   ', movieResult.diagnostics[0]?.message);
                    } catch (err: any) {
                        console.log(`  Movie Error: ${err.message}`);
                    }

                    try {
                        const tvResult = await provider.getTVSources(mediaTv);
                        const hasTv = tvResult && tvResult.sources && tvResult.sources.length > 0;
                        console.log(`  TV: ${hasTv ? 'OK' : 'FAIL'}`);
                        if (!hasTv && tvResult?.diagnostics) console.log('   ', tvResult.diagnostics[0]?.message);
                    } catch (err: any) {
                        console.log(`  TV Error: ${err.message}`);
                    }
                }
            } catch (e: any) {
                console.log(`\nFailed to load ${folder}: ${e.message}`);
            }
        }
    }
}

testProviders().then(() => console.log('Done'));
