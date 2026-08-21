async function test() {
    const urls = [
        'https://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8',
        'https://test-streams.mux.dev/pts_shift/master.m3u8',
        'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        'https://vixsrc.to/playlist/273588?b=1&token=327be248d0e8b01f354e516bc3d224f5&expires=1792518255&h=1'
    ];
    for (const url of urls) {
        const start = Date.now();
        try {
            const res = await fetch(url, { method: 'GET' });
            console.log(url, res.ok, res.status, Date.now() - start, 'ms');
        } catch (e) {
            console.log(url, 'Error:', e.message, Date.now() - start, 'ms');
        }
    }
}
test();
