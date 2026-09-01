import { OMSSServer } from '@omss/framework';
import 'dotenv/config';

// Sanitize environment variables since some platforms might inject them with inline comments
for (const key of Object.keys(process.env)) {
    const val = process.env[key];
    if (typeof val === 'string' && val.includes('#')) {
        process.env[key] = val.split('#')[0].trim();
    }
}

// Force valid configurations for the dev server environment
if (!process.env.TMDB_API_KEY || process.env.TMDB_API_KEY === 'your_tmdb_api_key_here') {
    process.env.TMDB_API_KEY = 'fake_key';
}

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { knownThirdPartyProxies } from './thirdPartyProxies.js';
import { streamPatterns } from './streamPatterns.js';
import { configure as configureKaizoku } from 'kaizoku-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getEnv = (key: string, def?: string): any => {
    const val = process.env[key];
    if (!val) return def;
    return val.split('#')[0].trim() || def;
};

async function main() {
    configureKaizoku({ tmdbApiKey: (getEnv('TMDB_API_KEY') && getEnv('TMDB_API_KEY') !== 'your_tmdb_api_key_here') ? getEnv('TMDB_API_KEY') : 'fake_key' });
    configureKaizoku({ tmdbApiKey: (getEnv('TMDB_API_KEY') && getEnv('TMDB_API_KEY') !== 'your_tmdb_api_key_here') ? getEnv('TMDB_API_KEY') : 'fake_key' });
    const server = new OMSSServer({
        name: 'CinePro',
        version: '1.0.0',

        // Network
        host: '0.0.0.0',
        port: 3000,
        publicUrl: process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL,

        // Cache (memory for dev, Redis for prod)
        cache: {
            type: (getEnv('CACHE_TYPE') as 'memory' | 'redis') ?? 'memory',
            ttl: {
                sources: 60 * 60 * 6,
                subtitles: 60 * 60 * 24
            },
            redis: {
                host: getEnv('REDIS_HOST', 'localhost'),
                port: Number(getEnv('REDIS_PORT', '6379')),
                password: getEnv('REDIS_PASSWORD')
            }
        },

        // TMDB
        tmdb: {
            apiKey: (getEnv('TMDB_API_KEY') && getEnv('TMDB_API_KEY') !== 'your_tmdb_api_key_here') 
                ? getEnv('TMDB_API_KEY') 
                : 'fake_key',
            cacheTTL: 24 * 60 * 60 // 24h
        },

        // Third Party Proxy removal
        proxyConfig: {
            knownThirdPartyProxies: knownThirdPartyProxies,
            streamPatterns
        },

        cors: {
            origin: getEnv('CORS_ORIGIN', '*'),
            methods: ['GET', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            exposedHeaders: ['Content-Range', 'Accept-Ranges', 'ETag'],
            preflightContinue: false,
            optionsSuccessStatus: 204
        }});

    // Register providers
    const registry = server.getRegistry();
    await registry.discoverProviders(path.join(__dirname, './providers/'));
    console.log("REGISTERED PROVIDERS:", registry.getProviders().map(p => p.id));

    
    // Smart Sorting: Internet Speed Adaptive
    const app = server.getInstance();
    app.addHook('onSend', async (request: any, reply: any, payload: any) => {
        if (typeof payload === 'string' && (request.url.includes('/v1/movies') || request.url.includes('/v1/tv'))) {
            try {
                const data = JSON.parse(payload);
                if (data && data.sources && Array.isArray(data.sources)) {
                    await Promise.all(data.sources.map(async (src: any) => {
                        if (src.type === 'mp4' && src.url && src.url.includes('/v1/proxy')) {
                            try {
                                // Extract the real URL from the proxy data query
                                const urlObj = new URL(src.url);
                                const proxyDataStr = urlObj.searchParams.get('data');
                                if (proxyDataStr) {
                                    const proxyData = JSON.parse(decodeURIComponent(proxyDataStr));
                                    const realUrl = proxyData.url;
                                    
                                    // Fetch size from real URL to avoid proxy overhead
                                    const res = await fetch(realUrl, { method: 'HEAD', signal: AbortSignal.timeout(1500) });
                                    if (res.ok) {
                                        const len = res.headers.get('content-length');
                                        if (len) src.size = parseInt(len, 10);
                                    }
                                    
                                    // Removed .mp4 rewrite to fix byte-range streaming on the frontend video player
                                    // src.url = src.url.replace('/v1/proxy?', '/v1/proxy/video.mp4?');
                                }
                            } catch (e) {
                                // Ignore timeout or fetch errors
                            }
                        } else if (src.type === 'mp4' && src.url && src.url.startsWith('http')) {
                             // Fallback if it's already a direct URL (e.g., from SuperStream)
                             try {
                                const res = await fetch(src.url, { method: 'HEAD', signal: AbortSignal.timeout(1500) });
                                if (res.ok) {
                                    const len = res.headers.get('content-length');
                                    if (len) src.size = parseInt(len, 10);
                                }
                             } catch(e) {}
                        }
                    }));

                    data.sources.sort((a: any, b: any) => {
                        const getScore = (q: any, t: any) => {
                            const quality = (q || '').toLowerCase();
                            const type = (t || '').toLowerCase();
                            if (quality === 'auto' || type === 'hls' || type === 'dash') return 100;
                            if (quality.includes('4k') || quality.includes('2160')) return 90;
                            if (quality.includes('1080')) return 80;
                            if (quality.includes('720')) return 70;
                            if (quality.includes('480')) return 60;
                            if (quality.includes('360')) return 50;
                            return 10;
                        };
                        return getScore(b.quality, b.type) - getScore(a.quality, a.type);
                    });
                    return JSON.stringify(data);
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
        return payload;
    });

    app.get('/v1/proxy/video.mp4', async (request: any, reply: any) => {
        // Redirect to the actual proxy route, keeping the query string intact
        const query = new URLSearchParams(request.query as any).toString();
        return reply.redirect(`/v1/proxy?${query}`);
    });

    await server.start();

    const publicUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

    // Anti-Sleep Heartbeat for Render's free tier
    // Sends a ping to itself every 14 minutes to prevent the container from sleeping
    if (process.env.RENDER_EXTERNAL_URL) {
        console.log(`[Heartbeat] Anti-sleep activated. Pinging ${process.env.RENDER_EXTERNAL_URL} every 14 minutes.`);
        setInterval(() => {
            fetch(process.env.RENDER_EXTERNAL_URL as string)
                .then(res => console.log(`[Heartbeat] Kept server awake: ${res.status}`))
                .catch(err => console.error(`[Heartbeat] Ping failed:`, err.message));
        }, 14 * 60 * 1000);
    }

    const uiUrl = `https://ui.cinepro.cc/?omssurl=${encodeURIComponent(publicUrl)}`;

    const title = '🚀 CinePro/ui is in public testing';
    const contrib =
        '🤝 We are looking for contributors to improve and develop!';
    const repo = 'Contribute: https://github.com/cinepro-org/ui';
    const tryIt = `🌐 Try it out: ${uiUrl} !`;
    const note =
        'You will need to give the website "access to local applications" that it works.';

    const lines = [title, '', repo, '', contrib, '', tryIt, '', note];

    // compute box width based on longest line
    const width = Math.max(...lines.map((l) => l.length)) + 2;

    const borderTop = '╭' + '─'.repeat(width) + '╮';
    const borderBottom = '╰' + '─'.repeat(width) + '╯';

    const pad = (line: string) => '│ ' + line.padEnd(width - 2, ' ') + ' │';

    console.log(`
================== CINEPRO BETA ANNOUNCEMENT ==================

${borderTop}
${lines.map(pad).join('\n')}
${borderBottom}
`);
}


export default {
    async fetch(request: any, env: any, ctx: any) {
        return new Response(
            JSON.stringify({
                status: "success",
                message: "CinePro Core is running on Cloudflare Workers",
                note: "Full API functionality requires Node.js environment (Docker/Render/Vercel)."
            }),
            {
                headers: { "Content-Type": "application/json" }
            }
        );
    }
};

const isCloudflareWorker = typeof (globalThis as any).WebSocketPair !== 'undefined';
if (!isCloudflareWorker) {
    main().catch((err) => {
        console.error("Server crashed:", err);
        process.exit(1);
    });
}

