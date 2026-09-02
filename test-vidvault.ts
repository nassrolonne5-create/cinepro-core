import axios from 'axios';

async function run() {
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        Referer: `https://vidvault.ru/`,
        Origin: "https://vidvault.ru",
        "X-Requested-With": "XMLHttpRequest",
    };
    try {
        const tokenRes = await axios.get("https://vidvault.ru/api/get-token", { headers: HEADERS });
        console.log("Token:", tokenRes.data.t);
        const token = tokenRes.data.t;

        const res = await axios.post("https://vidvault.ru/api/download-proxy", {
            type: "movie", tmdbId: "550", season: undefined, episode: undefined
        }, {
            headers: {
                ...HEADERS,
                "Content-Type": "application/json",
                "x-request-token": token,
            }
        });
        console.log("Status:", res.status);
        console.log("Data:", JSON.stringify(res.data).substring(0, 200));
    } catch(e: any) {
        console.log("Error:", e.response?.status, e.message);
    }
}
run();
