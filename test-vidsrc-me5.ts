async function run() {
    const res = await fetch('https://vidsrc.me/vs_src.php?type=movie&id=550');
    console.log("Status:", res.status);
    const html = await res.text();
    console.log("Response length:", html.length);
    console.log("Sample:", html.substring(0, 200));
}
run();
