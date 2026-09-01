import axios from 'axios';
import { getSourceType } from './src/utils/streamType.js';

const BASE_URL = 'https://embed.vidrift.in';
const HEADERS = {
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': `${BASE_URL}/`,
    'Origin': BASE_URL,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0'
};

async function extractSources() {
    const tmdbId = '550';
    const endpoint = `${BASE_URL}/embed/movie/${tmdbId}`;

    const pageRes = await axios.get(endpoint, {
        headers: { ...HEADERS, Accept: 'text/html' }
    });
    
    const html = pageRes.data;
    
    const match = html.match(/embedMeta\s*=\s*(\{.*?\})/);
    if (!match || !match[1]) throw new Error("Failed to extract embedMeta token");
    
    const meta = JSON.parse(match[1]);
    const token = meta.playbackToken;
    console.log("Token:", token);
    
    const providers = ['selfhost', 'vaplayer', 'vidgod', 'turbo'];
    
    for (const p of providers) {
        try {
            const apiRes = await axios.get(`${BASE_URL}/api/source/movie/${tmdbId}?token=${encodeURIComponent(token)}&provider=${p}`, {
                headers: {
                    ...HEADERS,
                    'Referer': endpoint
                }
            });
            console.log("Provider", p, apiRes.data);
        } catch (err) {
            console.log("Error provider", p, err.message);
        }
    }
}

extractSources();
