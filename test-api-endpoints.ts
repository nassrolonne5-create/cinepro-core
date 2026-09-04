async function checkUrl(name, url) {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const text = await res.text();
        if (text.includes('m3u8') || text.includes('mp4') || (res.ok && text.startsWith('{'))) {
            console.log(`[+] ${name} might be active. Code: ${res.status}. Size: ${text.length}`);
            console.log(`    Sample: ${text.substring(0, 100)}`);
        } else {
            console.log(`[-] ${name} failed or returned HTML. Code: ${res.status}`);
        }
    } catch(e) {
        console.log(`[-] ${name} ERROR: ${e.message}`);
    }
}

async function run() {
    await checkUrl('multiembed', 'https://multiembed.mov/api/source/movie/550');
    await checkUrl('autoembed', 'https://autoembed.cc/api/movie/550');
    await checkUrl('smashy', 'https://embed.smashystream.com/playere.php?tmdb=550');
    await checkUrl('2embed', 'https://www.2embed.cc/embed/550');
    await checkUrl('vidsrc.vip', 'https://vidsrc.vip/embed/movie/550');
}
run();
