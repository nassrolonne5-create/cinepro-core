import { MOVIES } from '@consumet/extensions';

async function run() {
    const flixhq = new MOVIES.FlixHQ();
    try {
        console.log('Searching FlixHQ for Fight Club...');
        const search = await flixhq.search('Fight Club');
        if (search.results.length > 0) {
            const movieId = search.results[0].id;
            console.log('Fetching media info for:', movieId);
            const info = await flixhq.fetchMediaInfo(movieId);
            if (info.episodes && info.episodes.length > 0) {
                const epId = info.episodes[0].id;
                console.log('Fetching stream for episode:', epId);
                const stream = await flixhq.fetchEpisodeSources(epId, movieId);
                console.log('FlixHQ Success! Sources:', stream.sources.length);
            }
        }
    } catch(e) {
        console.log('FlixHQ Error:', e.message);
    }
}
run();
