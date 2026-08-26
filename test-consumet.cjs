const { MOVIES } = require('@consumet/extensions');
async function test() {
    const flixhq = new MOVIES.FlixHQ();
    try {
        const search = await flixhq.search("Fight Club");
        console.log(search);
        const info = await flixhq.fetchMediaInfo(search.results[0].id);
        console.log(info);
        const eps = info.episodes[0];
        const sources = await flixhq.fetchEpisodeSources(eps.id, info.id);
        console.log(sources);
    } catch (e) {
        console.error(e);
    }
}
test();
