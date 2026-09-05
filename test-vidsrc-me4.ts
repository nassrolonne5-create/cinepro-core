import * as cheerio from 'cheerio';
async function run() {
    const res = await fetch('https://vidsrc.me/embed/movie?tmdb=550');
    const html = await res.text();
    const $ = cheerio.load(html);
    console.log("Iframe attrs:", $('iframe').attr());
    console.log("All data-src:", $('[data-src]').length);
}
run();
