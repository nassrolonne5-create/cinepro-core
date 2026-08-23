const puppeteer = require('puppeteer');

const servers = [
    'https://www.vidking.net/embed/movie/278?autoPlay=true&color=e50914',
    'https://play.xpass.top/e/movie/278',
    'https://vidsync.xyz/embed/movie/278?autoPlay=true&theme=e50914',
    'https://vidnest.fun/movie/278',
    'https://player.videasy.net/movie/278?color=e50914&overlay=true',
    'https://www.zxcstream.xyz/player/movie/278',
    'https://vaplayer.ru/embed/movie/278',
    'https://moviesapi.to/movie/278',
    'https://vidfast.pro/movie/278',
    'https://airflix1.com/embed/movie/278',
    'https://vsembed.ru/embed/movie/278',
    'https://vidup.to/movie/278?autoPlay=true&theme=e50914&sub=en&chromecast=false',
    'https://cinesrc.st/embed/movie/278?color=%23e50914&autoskip=true&quality=1080',
    'https://peachify.top/embed/movie/278?autoPlay=true&sub=English&cast=hide&pip=hide&accent=e50914',
    'https://vidzen.fun/movie/278',
    'https://vidrock.ru/movie/278',
    'https://primesrc.me/embed/movie?tmdb=278&fallback=true&serverOrder=PrimeVid',
    'https://cinemaos.tech/player/278'
];

(async () => {
    for (const url of servers) {
        console.log(`\n\n=== Testing ${url} ===`);
        try {
            const res = await fetch(url);
            console.log("Status:", res.status);
            const html = await res.text();
            
            const titleMatch = html.match(/<title>(.*?)<\/title>/);
            console.log("Title:", titleMatch ? titleMatch[1] : "No title");
            
            // Check for m3u8 or mp4
            const m3u8Match = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
            const mp4Match = html.match(/(https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)/i);
            
            if (m3u8Match) console.log("Found m3u8:", m3u8Match[1]);
            if (mp4Match) console.log("Found mp4:", mp4Match[1]);
            
            // Check for typical tokens or api calls in scripts
            const scriptLen = html.length;
            console.log("HTML length:", scriptLen);
            
            if (html.includes("cf-browser-verification") || res.status === 403 || html.includes("Cloudflare")) {
                console.log("WARNING: Cloudflare detected");
            }
        } catch (e) {
            console.log("Error fetching:", e.message);
        }
    }
})();
