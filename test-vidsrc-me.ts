async function run() {
    try {
        const res = await fetch('https://vidsrc.me/embed/movie?tmdb=550', { signal: AbortSignal.timeout(5000) });
        const html = await res.text();
        console.log("vidsrc.me:", res.status, html.length);
    } catch(e) {
        console.log("vidsrc.me error:", e.message);
    }
}
run();
