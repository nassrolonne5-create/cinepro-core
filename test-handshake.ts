async function run() {
    const pageRes = await fetch("https://vidcore.io/movie/550", {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
        }
    });
    const html = await pageRes.text();
    const primaryMatch = html.match(/\\"(?:en|token)\\":\\"(.*?)\\"/);
    const pageToken = primaryMatch?.[1];

    const encRes = await fetch(`https://enc-dec.app/api/enc-vidcore?text=${encodeURIComponent(pageToken!)}`);
    const encJson = await encRes.json();
    const handshake = encJson.result;
    
    const url = handshake.servers.replace('vidcore.io', 'vidcore.net');
    
    const serversPostRes = await fetch(url, {
        method: "POST",
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
            'Referer': 'https://vidcore.io/movie/550',
            'Origin': 'https://vidcore.io',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': handshake.token || ''
        }
    });
    
    console.log("Status:", serversPostRes.status);
    const text = await serversPostRes.text();
    console.log("Response:", text);
}
run();
