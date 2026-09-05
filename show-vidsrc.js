import http from 'http';

http.get('http://localhost:3000/v1/movies/550', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const vidsrc = json.sources?.filter(s => s.provider.id === 'vidsrc') || [];
            console.log(JSON.stringify(vidsrc, null, 2));
        } catch(e) {
            console.error("Error parsing JSON:", e.message);
        }
    });
});
