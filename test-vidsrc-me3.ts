import * as cheerio from 'cheerio';
async function run() {
    const res = await fetch('https://vidsrc.me/embed/movie?tmdb=550');
    const html = await res.text();
    const $ = cheerio.load(html);
    console.log("Iframes:", $('iframe').length);
    $('iframe').each((i, el) => {
        console.log("Iframe:", $(el).attr('src'));
    });
    console.log("Scripts with stream?", html.includes('.m3u8'));
}
run();
