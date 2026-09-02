import http from 'http';
http.get('http://localhost:3000/v1/tv/108978/seasons/1/episodes/1', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const directLinks = json.sources.filter(s => s.type === 'mp4' || s.url.includes('.mp4'));
            console.log("Found " + directLinks.length + " direct links:");
            directLinks.forEach(s => {
                console.log(`\n[${s.provider.name}] - Quality: ${s.quality}`);
                console.log(`${s.url}`);
            });
        } catch(e) {
            console.error(e);
        }
    });
});
