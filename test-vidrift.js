const providers = ['selfhost', 'vaplayer', 'vidgod', 'turbo'];
const baseUrl = "https://embed.vidrift.in";

async function run() {
    const res = await fetch(`${baseUrl}/embed/movie/550`, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
            "Referer": "https://vidrift.in/"
        }
    });
    
    const html = await res.text();
    const match = html.match(/embedMeta\s*=\s*(\{.*?\})/);
    if (!match) {
        console.log("No embedMeta found");
        return;
    }
    
    const meta = JSON.parse(match[1]);
    console.log("Meta:", meta.playbackToken);
    
    for (const p of providers) {
        console.log(`\nFetching provider: ${p}`);
        const apiRes = await fetch(`${baseUrl}/api/source/movie/550?token=${encodeURIComponent(meta.playbackToken)}&provider=${p}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
                "Referer": `${baseUrl}/embed/movie/550`
            }
        });
        const data = await apiRes.json();
        console.log(JSON.stringify(data, null, 2));
    }
}
run();
