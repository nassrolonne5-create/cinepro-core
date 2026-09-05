const http = require('http');

http.get('http://localhost:3000/v1/movies/550', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const vidsrc = json.sources.filter(s => s.provider.id === 'vidsrc');
            const vidfast = json.sources.filter(s => s.provider.id === 'vidfast');
            
            console.log("VidSrc Sources:", JSON.stringify(vidsrc, null, 2));
            console.log("VidFast Sources:", JSON.stringify(vidfast, null, 2));
            
            const vidsrcDiag = json.diagnostics.filter(d => d.message.toLowerCase().includes('vidsrc'));
            const vidfastDiag = json.diagnostics.filter(d => d.message.toLowerCase().includes('vidfast'));
            console.log("VidSrc Diagnostics:", vidsrcDiag);
            console.log("VidFast Diagnostics:", vidfastDiag);
            
        } catch(e) {
            console.error("Error parsing JSON:", e.message);
        }
    });
});
