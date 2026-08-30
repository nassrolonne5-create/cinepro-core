import { fetchSources } from 'kaizoku-core/providers/movies/cinesu';
fetchSources('550', 'movie').then(res => console.log(JSON.stringify(res, null, 2))).catch(console.error);
