import axios from 'axios';

async function run() {
    const tmdbId = '550';
    try {
        const res = await axios.get(`https://embed.su/embed/movie/${tmdbId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html'
            }
        });
        console.log("Embed.su status:", res.status);
        
        // Let's see if we can find the token in the HTML
        const html = res.data;
        // Looking for JS files or variables
        const scriptMatch = html.match(/<script\s+src="([^"]+\.js[^"]*)"/g);
        console.log("Scripts found:", scriptMatch ? scriptMatch.slice(0, 5) : 'None');
        
        // Find base64 encoded config or window.hash
        const hashMatch = html.match(/window\.hash\s*=\s*'([^']+)'/);
        console.log("Hash match:", hashMatch ? "Found" : "Not found");
        
    } catch (e: any) {
        console.log("Error:", e.response?.status || e.message);
    }
}
run();
