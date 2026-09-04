import { makeProviders, makeStandardFetcher, targets } from '@movie-web/providers';

async function run() {
    try {
        const fetcher = makeStandardFetcher(fetch);
        const providers = makeProviders({ fetcher, target: targets.NATIVE });
        
        console.log("Providers available:", providers.listSources().map(s => s.id));

        const media = {
            type: 'movie',
            title: 'Fight Club',
            releaseYear: 1999,
            tmdbId: '550',
            imdbId: 'tt0137523'
        };

        console.log("Running movie-web providers for Fight Club...");
        
        const output = await providers.runAll({
            media: media,
            sourceOrder: ['vidsrc', 'flixhq', 'superstream', 'showbox', 'goojara', 'zoro']
        });
        
        console.log("Result:", output);
    } catch (e) {
        console.log("Error:", e);
    }
}
run();
