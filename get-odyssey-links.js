import http from 'http';

function fetchMovieSources(tmdbId, title) {
    console.log(`\nFetching links for: ${title} (TMDB ID: ${tmdbId})`);
    http.get(`http://localhost:3000/v1/movies/${tmdbId}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (!json.sources) {
                    console.log("No sources found or error:", json);
                    return;
                }
                const directLinks = json.sources.filter(s => s.type === 'mp4' || s.url.includes('.mp4') || s.type === 'hls' || s.url.includes('.m3u8'));
                console.log(`Found ${directLinks.length} total links:`);
                directLinks.forEach(s => {
                    console.log(`\n[${s.provider.name}] - Quality: ${s.quality} - Type: ${s.type}`);
                    console.log(`${s.url}`);
                });
            } catch(e) {
                console.error("Parse error:", e);
            }
        });
    });
}

fetchMovieSources('1698863', 'The Odyssey (2026)');
fetchMovieSources('62', '2001: A Space Odyssey');
