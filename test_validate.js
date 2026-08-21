async function test() {
    const urls = [
        'https://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8',
        'https://test-streams.mux.dev/pts_shift/master.m3u8',
        'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    ];
    for (const url of urls) {
        try {
            const res = await fetch(url, { method: 'GET' });
            console.log(url, res.ok, res.status);
        } catch (e) {
            console.log(url, 'Error:', e.message);
        }
    }
}
test();
