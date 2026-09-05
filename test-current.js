import http from 'http';

http.get('http://localhost:3000/v1/movies/550', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Total Sources:", json.sources?.length);
            
            const vidsrc = json.sources?.filter(s => s.provider.id === 'vidsrc') || [];
            const vidfast = json.sources?.filter(s => s.provider.id === 'vidfast') || [];
            const vidnest = json.sources?.filter(s => s.provider.id === 'vidnest') || [];
            
            console.log("VidSrc Count:", vidsrc.length);
            if (vidsrc.length > 0) console.log("Sample VidSrc URL:", vidsrc[0].url);
            
            console.log("VidFast Count:", vidfast.length);
            if (vidfast.length > 0) console.log("Sample VidFast URL:", vidfast[0].url);
            
            const diags = json.diagnostics || [];
            console.log("Diagnostics:", JSON.stringify(diags, null, 2));
            
        } catch(e) {
            console.error("Error parsing JSON:", e.message);
        }
    });
});
