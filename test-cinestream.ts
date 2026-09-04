async function checkUrl(name, url) {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const text = await res.text();
        console.log(`[+] ${name} length: ${text.length}. Sample: ${text.substring(0, 100).replace(/\n/g, ' ')}`);
    } catch(e) {
        console.log(`[-] ${name} ERROR: ${e.message}`);
    }
}
async function run() {
    await checkUrl('vidlink', 'https://vidlink.pro/api/movie/550');
    await checkUrl('ridomovies', 'https://ridomovies.tv/movies/fight-club');
    await checkUrl('2embed-json', 'https://www.2embed.cc/api/movie/550');
    await checkUrl('autoembed-json', 'https://autoembed.cc/api/source/movie/550');
}
run();
