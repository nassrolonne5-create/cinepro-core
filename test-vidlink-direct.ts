import axios from 'axios';
async function run() {
    try {
        const res = await axios.get(`https://vidlink.pro/api/movie/550`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        console.log("Vidlink status:", res.status);
    } catch (e: any) {
        console.log("Vidlink Error:", e.response?.status || e.message);
    }
}
run();
