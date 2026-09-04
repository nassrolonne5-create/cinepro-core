import { MOVIES } from '@consumet/extensions';

async function testProvider(name, ProviderClass) {
    try {
        const p = new ProviderClass();
        const search = await p.search('Fight Club');
        if (search.results.length > 0) {
            const movieId = search.results[0].id;
            const info = await p.fetchMediaInfo(movieId);
            if (info.episodes && info.episodes.length > 0) {
                const epId = info.episodes[0].id;
                const stream = await p.fetchEpisodeSources(epId, movieId);
                console.log(`[+] ${name} SUCCESS: ${stream.sources.length} sources`);
                return;
            }
        }
        console.log(`[-] ${name} FAILED: No sources found or empty`);
    } catch(e) {
        console.log(`[-] ${name} ERROR: ${e.message}`);
    }
}

async function run() {
    const providers = [
        ['FlixHQ', MOVIES.FlixHQ],
        ['Goku', MOVIES.Goku],
        ['SFlix', MOVIES.SFlix],
        ['HiMovies', MOVIES.HiMovies],
        ['DramaCool', MOVIES.DramaCool],
        ['Turkish123', MOVIES.Turkish123]
    ];
    for (const [name, p] of providers) {
        await testProvider(name, p);
    }
}
run();
