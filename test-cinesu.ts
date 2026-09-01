import axios from 'axios';
async function run() {
    try {
        const res = await axios.get(`https://cinesu.net/embed/movie/550`);
        console.log("Cinesu.net status:", res.status);
    } catch (e: any) {
        console.log("Error:", e.response?.status || e.message);
    }
}
run();
