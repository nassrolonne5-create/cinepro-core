import { fetchSources as fetchOpstream } from 'kaizoku-core/providers/movies/opstream';
import { fetchSources as fetchVidcore } from 'kaizoku-core/providers/movies/vidcore';
import { fetchSources as fetchPeachify } from 'kaizoku-core/providers/movies/peachify';

async function testProvider(name: string, fetchFn: any) {
    try {
        const data = await fetchFn('550', 'movie');
        console.log(`${name} SUCCESS: ${data?.sources?.length || 0} sources`);
    } catch (e) {
        console.log(`${name} ERROR: ${e.message}`);
    }
}

async function run() {
    await testProvider('OpStream', fetchOpstream);
    await testProvider('VidCore', fetchVidcore);
    await testProvider('Peachify', fetchPeachify);
}
run();
