async function run() {
    console.log("Fetching...");
    const res = await fetch("https://vidcore.io/movie/550");
    const html = await res.text();
    const tokenMatch = html.match(/id="([^"]+)"\s*class="player-iframe"/);
    const buildIdMatch = html.match(/"buildId":"([^"]+)"/);
    console.log("Token Match:", tokenMatch?.[1]);
    console.log("Build ID Match:", buildIdMatch?.[1]);
    
    // Also try to find if they are generating an iframe URL
    const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
    console.log("Iframe src:", iframeMatch?.[1]);
}
run();
