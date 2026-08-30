const { VidLinkProvider } = require('./dist/providers/vidlink/vidlink.js');
const p = new VidLinkProvider();
p.getMovieSources({ tmdbId: '550', type: 'movie' }).then(console.log);
