import axios from 'axios';

const HEADERS = {
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': `https://embed.vidrift.in/`,
    'Origin': 'https://embed.vidrift.in',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0'
};

async function run() {
    try {
        const res = await axios.get('https://embed.vidrift.in/embed/movie/550', { headers: HEADERS });
        console.log("Axios:", res.status);
    } catch(e) {
        console.log("Axios error:", e.response?.status || e.message);
    }
}
run();
