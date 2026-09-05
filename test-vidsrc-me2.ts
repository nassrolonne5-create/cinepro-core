import * as cheerio from 'cheerio';
async function run() {
    const res = await fetch('https://vidsrc.me/embed/movie?tmdb=550');
    const html = await res.text();
    const $ = cheerio.load(html);
    const iframe = $('iframe#player_iframe').attr('src');
    console.log("Iframe:", iframe);
    
    if (iframe) {
        const ires = await fetch(iframe.startsWith('//') ? 'https:' + iframe : iframe, {
            headers: { 'Referer': 'https://vidsrc.me/' }
        });
        const ihtml = await ires.text();
        console.log("Iframe HTML size:", ihtml.length);
        const sourceMatch = ihtml.match(/source\s*:\s*['"]([^'"]+)['"]/);
        console.log("Source match:", sourceMatch ? sourceMatch[1] : null);
    }
}
run();
