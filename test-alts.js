import { fetchSources as cinesu } from 'kaizoku-core/providers/movies/cinesu';
import { fetchSources as opstream } from 'kaizoku-core/providers/movies/opstream';
import { fetchSources as peachify } from 'kaizoku-core/providers/movies/peachify';
import { fetchSources as trendimovies } from 'kaizoku-core/providers/movies/trendimovies';
import { fetchSources as vidnest } from 'kaizoku-core/providers/movies/vidnest';
import { fetchSources as vidrift } from 'kaizoku-core/providers/movies/vidrift';
import { fetchSources as vidup } from 'kaizoku-core/providers/movies/vidup';

const alts = { cinesu, opstream, peachify, trendimovies, vidnest, vidrift, vidup };

async function run() {
    for (const [name, fn] of Object.entries(alts)) {
        try {
            const res = await fn('550', 'movie');
            console.log(`${name}: ${res.sources.length} sources`);
        } catch (e) {
            console.log(`${name}: Failed - ${e.message}`);
        }
    }
}
run();
