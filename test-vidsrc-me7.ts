async function run() {
    const res1 = await fetch('https://vidsrc.me/vs_src.php?type=movie&id=550');
    const json = await res1.json();
    console.log("Iframe:", json.src);
    
    const res2 = await fetch(json.src, {
        headers: { 'Referer': 'https://vidsrc.me/' }
    });
    console.log("Status:", res2.status);
    const html = await res2.text();
    console.log("Stream match?", html.includes('m3u8'));
    console.log("File Match:", html.match(/file\s*:\s*['"]([^'"]+)['"]/)?.[1]);
    console.log("Source Match:", html.match(/source\s*:\s*['"]([^'"]+)['"]/)?.[1]);
}
run();
