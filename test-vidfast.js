import { fetchSources } from 'kaizoku-core/providers/movies/vidfast.js';
fetchSources('1698863', 'movie').then(console.log).catch(console.error);
