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
if (!process.env.TMDB_API_KEY || process.env.TMDB_API_KEY === 'your_tmdb_api_key_here' || process.env.TMDB_API_KEY === 'fake_key') {
    process.env.TMDB_API_KEY = '5201b54eb0968700e693a30576d7d4dc';
}

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { knownThirdPartyProxies } from './thirdPartyProxies.js';
import { streamPatterns } from './streamPatterns.js';
import { configure as configureKaizoku } from 'kaizoku-core';
import { setupThreePillarArchitecture, subscribeToStreams } from './threePillars.js';
import {
    getLiveChannels,
    getLiveSportEvents,
    resolveChannelStreams,
    generateChannelMasterPlaylist,
    resolveMatchStreams,
    generateMatchMasterPlaylist,
    getChannelEPG,
    getAllChannelsEPG,
    generateXMLTVEPG,
    generateSportsM3UPlaylist,
    handleLiveHlsProxyRequest,
    startBackgroundStreamHealthMonitor,
    getLiveEngineHealthStats
} from './iptv/liveSportsEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getEnv = (key: string, def?: string): any => {
    const val = process.env[key];
    if (!val) return def;
    return val.split('#')[0].trim() || def;
};

async function main() {
    configureKaizoku({ tmdbApiKey: (getEnv('TMDB_API_KEY') && getEnv('TMDB_API_KEY') !== 'your_tmdb_api_key_here' && getEnv('TMDB_API_KEY') !== 'fake_key') ? getEnv('TMDB_API_KEY') : '5201b54eb0968700e693a30576d7d4dc' });
    
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
                sources: 60 * 10, // 10 minutes
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
            apiKey: (getEnv('TMDB_API_KEY') && getEnv('TMDB_API_KEY') !== 'your_tmdb_api_key_here' && getEnv('TMDB_API_KEY') !== 'fake_key') 
                ? getEnv('TMDB_API_KEY') 
                : '5201b54eb0968700e693a30576d7d4dc',
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
        }
    });

    // Register providers
    const registry = server.getRegistry();
    const providersDir = fs.existsSync(path.join(process.cwd(), 'dist/providers'))
        ? path.join(process.cwd(), 'dist/providers')
        : path.join(__dirname, './providers/');
    await registry.discoverProviders(providersDir);
    console.log("REGISTERED PROVIDERS:", registry.getProviders().map(p => p.id));
    
    // Mount the Three-Pillar Architecture (Batching, Progressive Delivery & Circuit Breakers)
    setupThreePillarArchitecture(server);
    
    // Smart Sorting: Internet Speed Adaptive
    const app = server.getInstance();
    
    app.addHook('onSend', async (request: any, reply: any, payload: any) => {
        if (typeof payload === 'string' && (request.url.includes('/v1/movies') || request.url.includes('/v1/tv'))) {
            try {
                const data = JSON.parse(payload);
                const proto = request.headers['x-forwarded-proto'] || (request.socket?.encrypted ? 'https' : 'http');
                const host = request.headers['x-forwarded-host'] || request.headers.host || 'localhost:3000';
                const publicBaseUrl = `${proto}://${host}`;
                
                if (data && data.sources && Array.isArray(data.sources)) {
                    // Filter out known dead, blocked, silent, or Indian/Punjabi/Hindi dubbed hosts FIRST
                    data.sources = data.sources.filter((s: any) => {
                        const rawUrl = (s.url || '').toLowerCase();
                        let url = rawUrl;
                        try { url = decodeURIComponent(rawUrl); } catch {}
                        const server = (s.server || '').toLowerCase();
                        const quality = (s.quality || '').toLowerCase();
                        const provName = (s.provider?.name || s.provider?.id || s.provider || '').toLowerCase();

                        // Dead, blocked, 404, or Cloudflare captcha hosts (including BoomChick, Neward WRONG HASH, 4pa.top timeouts)
                        const isHlsTxt = url.includes('master.txt') || url.includes('index.txt') || url.includes('playlist.txt') || url.includes('/hls');
                        if (
                            url.includes('boomchick.org') ||
                            url.includes('boomchick') ||
                            url.includes('neward.cyou') ||
                            url.includes('4pa.top') ||
                            url.includes('professionaladvisory.sbs') ||
                            url.includes('streamflixserver.site') ||
                            url.includes('cf.streamflixserver') ||
                            url.includes('goodstream.cc') ||
                            url.includes('staticreverie.site') ||
                            url.includes('animecurx.tech') ||
                            url.includes('halcyoncreative.site') ||
                            url.includes('homechefrecipes.sbs') ||
                            url.includes('boltx.stream') ||
                            url.includes('bestx.stream') ||
                            url.includes('appnumber.top') ||
                            url.includes('steman.cyou') ||
                            url.includes('onlinevisibilitysystem.site') ||
                            url.includes('highperformanceread.com') ||
                            url.includes('moon.zenoak.top/s/') ||
                            ((url.endsWith('.txt') || url.includes('.txt?')) && !isHlsTxt)
                        ) return false;

                        // Promotional teaser / sample short videos (e.g. 12s/21s promo clips)
                        if (
                            url.includes('aoneroom.com') ||
                            url.includes('animanga.fun') ||
                            url.includes('tiktoks') ||
                            url.includes('streamx.me/videos/netflix.mp4') ||
                            url.includes('/sample/') ||
                            url.includes('sample.mp4') ||
                            url.includes('trailer.mp4') ||
                            url.includes('/promo/') ||
                            url.includes('promo/cinecat')
                        ) return false;

                        // Silent / video-only streams without audio
                        if (url.includes('rousav.tech') || server.includes('apogee')) return false;

                        // Foreign non-English dubbed mirror hosts
                        if (
                            url.includes('cheaptruckrepairs.cc') ||
                            url.includes('480ptvseries.com') ||
                            url.includes('vividdubbing') ||
                            url.includes('hindi') ||
                            url.includes('punjabi') ||
                            url.includes('tamil') ||
                            url.includes('telugu') ||
                            url.includes('latino') ||
                            url.includes('dublado') ||
                            url.includes('castellano') ||
                            server.includes('hindi') ||
                            server.includes('punjabi') ||
                            server.includes('tamil') ||
                            server.includes('telugu') ||
                            server.includes('latino') ||
                            server.includes('dublado') ||
                            server.includes('castellano') ||
                            quality.includes('hindi') ||
                            quality.includes('punjabi') ||
                            quality.includes('tamil') ||
                            quality.includes('telugu') ||
                            quality.includes('latino') ||
                            quality.includes('dublado') ||
                            quality.includes('castellano') ||
                            provName.includes('hindi') ||
                            provName.includes('punjabi') ||
                            provName.includes('tamil') ||
                            provName.includes('telugu')
                        ) return false;

                        return true;
                    });

                    // Universal Provider & Server Namespacing:
                    // Ensures that EVERY provider and mirror has an explicit, unique Server name and Provider ID,
                    // preventing generic names like "Direct 1080p" or undefined servers from colliding and reducing
                    // the visible server count on the frontend from 25+ down to 7-9.
                    for (const src of data.sources) {
                        const rawProvName = (typeof src.provider === 'string' ? src.provider : (src.provider?.name || src.provider?.id || 'Server')).trim();
                        const provBase = rawProvName.replace(/\s*\([^)]*\)$/, '').trim() || 'Server';
                        const rawServer = (src.server || '').trim();

                        let formattedServer = rawServer;
                        if (!formattedServer || formattedServer.toLowerCase() === 'unknown') {
                            const subTag = rawProvName.includes('(') ? rawProvName.replace(/^.*\(([^)]+)\).*$/, '$1') : 'Stream';
                            formattedServer = `${provBase} (${subTag})`;
                        } else if (
                            formattedServer.toLowerCase().startsWith('direct') ||
                            formattedServer.toLowerCase().startsWith('mirror') ||
                            formattedServer.toLowerCase() === 'fast' ||
                            formattedServer.toLowerCase() === 'prime'
                        ) {
                            formattedServer = `${provBase} (${formattedServer})`;
                        } else if (!formattedServer.toLowerCase().includes(provBase.toLowerCase())) {
                            formattedServer = `${provBase} (${formattedServer})`;
                        }

                        src.server = formattedServer;

                        const serverSlug = formattedServer.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const provId = typeof src.provider === 'object' && src.provider?.id ? src.provider.id : provBase.toLowerCase().replace(/[^a-z0-9]/g, '');
                        src.provider = {
                            name: formattedServer,
                            id: provId.includes(serverSlug) ? provId : `${provId}-${serverSlug}`
                        };
                    }

                    for (const src of data.sources) {
                        // Normalize MKV to MP4 type for browser video element compatibility
                        if (src.type === 'mkv') {
                            src.type = 'mp4';
                        }

                        // Universal Mirage 4K (cine4k.mpddash.workers.dev) & ValhallaStream unwrapper
                        if (src.url && src.url.includes('valhallastream.com')) {
                            try {
                                const parsed = new URL(src.url);
                                const innerUrl = parsed.searchParams.get('url');
                                const rawInnerHeaders = parsed.searchParams.get('headers');
                                if (innerUrl) {
                                    const headers = innerUrl.includes('cine4k.mpddash.workers.dev')
                                        ? { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' }
                                        : (rawInnerHeaders ? JSON.parse(rawInnerHeaders) : {});
                                    src.url = `${publicBaseUrl}/v1/proxy?data=${encodeURIComponent(JSON.stringify({ url: innerUrl, headers }))}`;
                                }
                            } catch {}
                        } else if (src.url && src.url.includes('cine4k.mpddash.workers.dev') && src.url.includes('/v1/proxy')) {
                            try {
                                const parsed = new URL(src.url, publicBaseUrl);
                                const dataParam = parsed.searchParams.get('data');
                                if (dataParam) {
                                    const decoded = JSON.parse(decodeURIComponent(dataParam));
                                    if (decoded?.url?.includes('cine4k.mpddash.workers.dev')) {
                                        decoded.headers = {
                                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
                                        };
                                        src.url = `${publicBaseUrl}/v1/proxy?data=${encodeURIComponent(JSON.stringify(decoded))}`;
                                    }
                                }
                            } catch {}
                        }

                        // Fix proxy baseUrl so remote clients, mobile devices, and CinePro UI connect to the real server
                        if (src.url && src.url.includes('/v1/proxy')) {
                            src.url = src.url.replace(/^https?:\/\/[^/]+(?=\/v1\/proxy)/, publicBaseUrl);
                            if (src.url.startsWith('/v1/proxy')) {
                                src.url = publicBaseUrl + src.url;
                            }
                            // Rewrite proxy URL to have a .mp4 extension so Android DownloadManager doesn't fail
                            src.url = src.url.replace('/v1/proxy?', '/v1/proxy/video.mp4?');
                        } else if (src.url && src.url.includes('/v1/live/')) {
                            src.url = src.url.replace(/^https?:\/\/[^/]+(?=\/v1\/live\/)/, publicBaseUrl);
                            if (src.url.startsWith('/v1/live/')) {
                                src.url = publicBaseUrl + src.url;
                            }
                        }

                        if (src.masterUrl && src.masterUrl.includes('/v1/live/')) {
                            src.masterUrl = src.masterUrl.replace(/^https?:\/\/[^/]+(?=\/v1\/live\/)/, publicBaseUrl);
                            if (src.masterUrl.startsWith('/v1/live/')) {
                                src.masterUrl = publicBaseUrl + src.masterUrl;
                            }
                        }

                        if (Array.isArray(src.qualities)) {
                            for (const q of src.qualities) {
                                if (q?.url && q.url.includes('/v1/live/')) {
                                    q.url = q.url.replace(/^https?:\/\/[^/]+(?=\/v1\/live\/)/, publicBaseUrl);
                                    if (q.url.startsWith('/v1/live/')) {
                                        q.url = publicBaseUrl + q.url;
                                    }
                                }
                            }
                        }
                    }

                    if (Array.isArray(data.subtitles)) {
                        for (const sub of data.subtitles) {
                            if (sub.url && sub.url.includes('/v1/proxy')) {
                                sub.url = sub.url.replace(/^https?:\/\/[^/]+(?=\/v1\/proxy)/, publicBaseUrl);
                                if (sub.url.startsWith('/v1/proxy')) {
                                    sub.url = publicBaseUrl + sub.url;
                                }
                            }
                        }
                    }

                    // English-First Adaptive Sorting
                    data.sources.sort((a: any, b: any) => {
                        const getScore = (s: any) => {
                            const quality = (s.quality || '').toLowerCase();
                            const type = (s.type || '').toLowerCase();
                            const server = (s.server || '').toLowerCase();
                            const provName = (s.provider?.name || s.provider || '').toLowerCase();
                            const url = (s.url || '').toLowerCase();

                            // Severe penalty for foreign/dubbed audio (except multi-language IPTV Sports, StreamX & Anime Sub/Dub)
                            const isAnimeProvider =
                                provName.includes('animehub') ||
                                provName.includes('2dhive') ||
                                provName.includes('reanime') ||
                                provName.includes('megaplay') ||
                                provName.includes('anikoto') ||
                                provName.includes('aniwave') ||
                                provName.includes('animeparadise') ||
                                provName.includes('animesogo');
                            const isIntentionalMultiLang = provName.includes('iptv') || provName.includes('streamx') || isAnimeProvider;
                            const hasOnlyNonEnglish = !isIntentionalMultiLang && Array.isArray(s.audioTracks) && s.audioTracks.length > 0 && !s.audioTracks.some((t: any) => (typeof t === 'string' ? t === 'en' : t?.language === 'en'));
                            if (
                                quality.includes('hindi') || quality.includes('punjabi') || quality.includes('tamil') || quality.includes('telugu') || quality.includes('latino') || (!isAnimeProvider && quality.includes('dub')) ||
                                server.includes('hindi') || server.includes('punjabi') || server.includes('tamil') || server.includes('telugu') || server.includes('klikxxi') || server.includes('movies4f') || server.includes('movies5f') || server.includes('latino') || server.includes('dublado') ||
                                url.includes('klikxxi') || url.includes('indoxxi') || url.includes('layarkaca') || url.includes('vividdubbing') ||
                                hasOnlyNonEnglish
                            ) {
                                return -1000;
                            }

                            let score = 50;

                            // Highest priority boost (+120) for verified 100% English & Anime HD sources (4K HDR & 1080p FHD)
                            if (
                                url.includes('cookiebakers') ||
                                url.includes('bluevelvet.space') ||
                                url.includes('zenoak.top') ||
                                url.includes('vidrift.net') ||
                                url.includes('cine4k.mpddash.workers.dev') ||
                                url.includes('nexabloom.top') ||
                                url.includes('flixcloud.cc') ||
                                url.includes('echovideo.to') ||
                                url.includes('animeparadise.moe') ||
                                url.includes('remoteconsultinggroup.site') ||
                                url.includes('sprintspeedlight.lol') ||
                                url.includes('finepulfe.xyz') ||
                                url.includes('hakunaymatata.com') ||
                                url.includes('celestialdreamer.lol') ||
                                url.includes('infiniteparadox.live') ||
                                url.includes('trendimovies.com')
                            ) {
                                score += 120;
                            }

                            // Verified English-first, Anime & Tier-1 providers receive a solid priority boost (+40)
                            if (
                                isAnimeProvider ||
                                provName.includes('cinemaarmy') ||
                                provName.includes('watchflix') ||
                                provName.includes('trendimovies') ||
                                provName.includes('streamx') ||
                                provName.includes('iptv') ||
                                provName.includes('vidrift') ||
                                provName.includes('vidsrcwin') ||
                                provName.includes('vidvault') ||
                                provName.includes('vidfast') ||
                                provName.includes('cinecat') ||
                                provName.includes('icefy') ||
                                provName.includes('vidlink') ||
                                provName.includes('vidrock') ||
                                provName.includes('vidzee') ||
                                provName.includes('purstream') ||
                                provName.includes('rivestream') ||
                                provName.includes('superstream') ||
                                provName.includes('vidgod') ||
                                provName.includes('sflix') ||
                                provName.includes('cinesu') ||
                                provName.includes('vixsrc') ||
                                provName.includes('vidup') ||
                                provName.includes('embedsu') ||
                                provName.includes('vidsrc')
                            ) {
                                score += 40;
                            }

                            if (quality.includes('english')) score += 20;

                            if (quality === 'auto' || type === 'hls' || type === 'dash') {
                                score += 20;
                            } else if (quality.includes('4k') || quality.includes('2160')) {
                                score += 18;
                            } else if (quality.includes('1080')) {
                                score += 15;
                            } else if (quality.includes('720')) {
                                score += 10;
                            } else if (quality.includes('480')) {
                                score += 5;
                            }

                            return score;
                        };
                        return getScore(b) - getScore(a);
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

    // Real-Time Server-Sent Events (SSE) Progressive Streaming for Movies
    app.get('/v1/movies/:id/stream', async (request: any, reply: any) => {
        const id = request.params.id;
        const cacheKey = `movie:${id}`;

        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'X-Accel-Buffering': 'no'
        });

        // Push initial heartbeat/connected event
        reply.raw.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', cacheKey })}\n\n`);

        // Check cache first: if already resolved, stream immediately
        const cached = await (server as any).sourceService.cache.get(cacheKey);
        if (cached && Array.isArray(cached.sources) && cached.sources.length > 0) {
            for (const s of cached.sources) {
                reply.raw.write(`event: source\ndata: ${JSON.stringify(s)}\n\n`);
            }
            reply.raw.write(`event: done\ndata: ${JSON.stringify({ status: 'complete', count: cached.sources.length })}\n\n`);
            reply.raw.end();
            return;
        }

        // Subscribe to real-time provider source events as scrapers complete
        const unsubscribe = subscribeToStreams(cacheKey, (event: any) => {
            if (event.type === 'source') {
                reply.raw.write(`event: source\ndata: ${JSON.stringify(event.data)}\n\n`);
            } else if (event.type === 'done') {
                reply.raw.write(`event: done\ndata: ${JSON.stringify(event.data)}\n\n`);
                reply.raw.end();
            }
        });

        request.raw.on('close', () => {
            unsubscribe();
        });

        // Trigger Three-Pillars background scraping
        (server as any).sourceService.getMovieSources(id).catch(() => {});
    });

    // Real-Time Server-Sent Events (SSE) Progressive Streaming for TV Episodes
    app.get('/v1/tv/:id/seasons/:s/episodes/:e/stream', async (request: any, reply: any) => {
        const id = request.params.id;
        const s = Number(request.params.s || 1);
        const e = Number(request.params.e || 1);
        const cacheKey = `tv:${id}:s${s}:e${e}`;

        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'X-Accel-Buffering': 'no'
        });

        reply.raw.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', cacheKey })}\n\n`);

        const cached = await (server as any).sourceService.cache.get(cacheKey);
        if (cached && Array.isArray(cached.sources) && cached.sources.length > 0) {
            for (const src of cached.sources) {
                reply.raw.write(`event: source\ndata: ${JSON.stringify(src)}\n\n`);
            }
            reply.raw.write(`event: done\ndata: ${JSON.stringify({ status: 'complete', count: cached.sources.length })}\n\n`);
            reply.raw.end();
            return;
        }

        const unsubscribe = subscribeToStreams(cacheKey, (event: any) => {
            if (event.type === 'source') {
                reply.raw.write(`event: source\ndata: ${JSON.stringify(event.data)}\n\n`);
            } else if (event.type === 'done') {
                reply.raw.write(`event: done\ndata: ${JSON.stringify(event.data)}\n\n`);
                reply.raw.end();
            }
        });

        request.raw.on('close', () => {
            unsubscribe();
        });

        (server as any).sourceService.getTVSources(id, s, e).catch(() => {});
    });

    // Helper to resolve public origin for Live IPTV URLs
    const getRequestPublicBaseUrl = (request: any): string => {
        if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
        if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
        const proto = request.headers['x-forwarded-proto'] || (request.socket?.encrypted ? 'https' : 'http');
        const host = request.headers['x-forwarded-host'] || request.headers.host || 'localhost:3000';
        return `${proto}://${host}`;
    };

    // 1. Live Sports Channels Directory API (beIN AR/EN/FR/TR/ES, SSC Sports, Fox Sports, ESPN, Eurosport, etc. + Real-Time EPG)
    app.get('/v1/live/channels', async (request: any, reply: any) => {
        const baseUrl = getRequestPublicBaseUrl(request);
        const query = (request.query || {}) as { lang?: string; category?: string; q?: string };
        await getLiveSportEvents(baseUrl).catch(() => {});
        const channels = getLiveChannels(baseUrl, {
            lang: query.lang,
            category: query.category,
            query: query.q
        });
        const groups: Record<string, { count: number; channelIds: string[] }> = {};
        for (const ch of channels) {
            const grp = ch.group || ch.network;
            if (!groups[grp]) {
                groups[grp] = { count: 0, channelIds: [] };
            }
            groups[grp].count += 1;
            groups[grp].channelIds.push(ch.id);
        }
        return reply.code(200).send({
            status: 'ok',
            count: channels.length,
            epgXmlEndpoint: `${baseUrl}/v1/live/epg.xml`,
            epgJsonEndpoint: `${baseUrl}/v1/live/epg`,
            filters: {
                lang: query.lang || 'all',
                category: query.category || 'all',
                q: query.q || ''
            },
            groups,
            channels
        });
    });

    // 2. Live Sports Events & Match Scoreboard API (Champions League, EPL, LaLiga, Serie A, Roshn Saudi League, AFC, NBA, NFL, UFC)
    app.get('/v1/live/events', async (request: any, reply: any) => {
        const baseUrl = getRequestPublicBaseUrl(request);
        const query = (request.query || {}) as { sport?: string; status?: string };
        const events = await getLiveSportEvents(baseUrl, {
            sport: query.sport,
            status: query.status
        });
        return reply.code(200).send({
            status: 'ok',
            count: events.length,
            events
        });
    });

    // 2b. Full Electronic Program Guide (EPG) API across all or filtered channels (Now Playing, Next Up, Upcoming & 24h Schedule)
    app.get('/v1/live/epg', async (request: any, reply: any) => {
        const baseUrl = getRequestPublicBaseUrl(request);
        const query = (request.query || {}) as { lang?: string; category?: string; channelId?: string; q?: string };
        const epg = await getAllChannelsEPG(baseUrl, {
            lang: query.lang,
            category: query.category,
            channelId: query.channelId,
            query: query.q
        });
        return reply.code(200).send({
            status: 'ok',
            updatedAt: new Date().toISOString(),
            count: epg.length,
            xmltvUrl: `${baseUrl}/v1/live/epg.xml`,
            epg
        });
    });

    // 2c. XMLTV Standard EPG Feed for IPTV Players (TiviMate, VLC, Kodi, OTT Navigator)
    app.get('/v1/live/epg.xml', async (request: any, reply: any) => {
        const baseUrl = getRequestPublicBaseUrl(request);
        const query = (request.query || {}) as { lang?: string; category?: string };
        const xml = await generateXMLTVEPG(baseUrl, {
            lang: query.lang,
            category: query.category
        });
        return reply
            .code(200)
            .header('Content-Type', 'application/xml; charset=utf-8')
            .header('Access-Control-Allow-Origin', '*')
            .send(xml);
    });

    // 2d. Single Channel Detailed EPG Schedule API (Now Playing, Next Up, Upcoming, 24h Timeline)
    app.get('/v1/live/epg/:channelId', async (request: any, reply: any) => {
        const baseUrl = getRequestPublicBaseUrl(request);
        const channelId = String(request.params.channelId || '');
        await getLiveSportEvents(baseUrl).catch(() => {});
        const channelEpg = getChannelEPG(channelId, baseUrl);
        if (!channelEpg) {
            return reply.code(404).send({
                error: 'CHANNEL_NOT_FOUND',
                message: `No EPG schedule found for channel '${channelId}'`
            });
        }
        return reply.code(200).send({
            status: 'ok',
            ...channelEpg
        });
    });

    // 3. Resolve & Verify Live Channel Streams (JSON) + Channel EPG + Multi-Quality Variants
    app.get('/v1/live/stream/:channelId', async (request: any, reply: any) => {
        const baseUrl = getRequestPublicBaseUrl(request);
        const channelId = String(request.params.channelId || '');
        const resolved = await resolveChannelStreams(channelId, baseUrl);
        if (!resolved.channel) {
            return reply.code(404).send({
                error: 'CHANNEL_NOT_FOUND',
                message: `No live sports channel found matching '${channelId}'`
            });
        }
        return reply.code(200).send({
            status: 'ok',
            channel: resolved.channel,
            epg: resolved.epg,
            masterPlaylistUrl: resolved.masterPlaylistUrl,
            count: resolved.sources.length,
            sources: resolved.sources
        });
    });

    // 3b. Virtual Multi-Quality & Multi-Server Master HLS Playlist (/v1/live/master/:channelId.m3u8)
    const handleMasterPlaylist = async (request: any, reply: any) => {
        const baseUrl = getRequestPublicBaseUrl(request);
        const rawParam = String(request.params.channelId || '').replace(/\.m3u8$/i, '');
        const masterM3U = await generateChannelMasterPlaylist(rawParam, baseUrl);
        if (!masterM3U) {
            return reply.code(404).send({
                error: 'CHANNEL_NOT_FOUND',
                message: `No master playlist available for channel '${rawParam}'`
            });
        }
        return reply
            .code(200)
            .header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
            .header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            .header('Access-Control-Allow-Origin', '*')
            .send(masterM3U);
    };
    app.get('/v1/live/master/:channelId.m3u8', handleMasterPlaylist);
    app.get('/v1/live/master/:channelId', handleMasterPlaylist);

    // 3c. Live Match-to-Channel Auto-Router (/v1/live/match/:eventId)
    app.get('/v1/live/match/:eventId', async (request: any, reply: any) => {
        const baseUrl = getRequestPublicBaseUrl(request);
        const eventId = String(request.params.eventId || '').replace(/\.m3u8$/i, '');
        const resolved = await resolveMatchStreams(eventId, baseUrl);
        if (!resolved.event) {
            return reply.code(404).send({
                error: 'MATCH_NOT_FOUND',
                message: `No live or upcoming match found matching '${eventId}'`
            });
        }
        return reply.code(200).send({
            status: 'ok',
            ...resolved
        });
    });

    // 3d. Virtual Match Master HLS Playlist (/v1/live/match/:eventId/master.m3u8)
    app.get('/v1/live/match/:eventId/master.m3u8', async (request: any, reply: any) => {
        const baseUrl = getRequestPublicBaseUrl(request);
        const eventId = String(request.params.eventId || '');
        const masterM3U = await generateMatchMasterPlaylist(eventId, baseUrl);
        if (!masterM3U) {
            return reply.code(404).send({
                error: 'MATCH_NOT_FOUND',
                message: `No match master playlist available for '${eventId}'`
            });
        }
        return reply
            .code(200)
            .header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
            .header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            .header('Access-Control-Allow-Origin', '*')
            .send(masterM3U);
    });

    // 3e. Live Engine Stability, Segment Cache & MPEG-TS Inspection Telemetry (/v1/live/health)
    app.get('/v1/live/health', async (_request: any, reply: any) => {
        return reply.code(200).send(getLiveEngineHealthStats());
    });

    // 4. Progressive SSE Stream Resolver for Live Sports Channels + Real-time EPG emission
    app.get('/v1/live/stream/:channelId/sse', async (request: any, reply: any) => {
        const baseUrl = getRequestPublicBaseUrl(request);
        const channelId = String(request.params.channelId || '');

        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'X-Accel-Buffering': 'no'
        });

        const initialEpg = getChannelEPG(channelId, baseUrl);
        reply.raw.write(
            `event: connected\ndata: ${JSON.stringify({
                status: 'connected',
                channelId,
                masterPlaylistUrl: `${baseUrl}/v1/live/master/${channelId}.m3u8`,
                epg: initialEpg
                    ? {
                          nowPlaying: initialEpg.nowPlaying,
                          nextUp: initialEpg.nextUp,
                          upcoming: initialEpg.upcoming
                      }
                    : null
            })}\n\n`
        );

        let closed = false;
        request.raw.on('close', () => {
            closed = true;
        });

        try {
            const resolved = await resolveChannelStreams(channelId, baseUrl, (verifiedSource) => {
                if (!closed) {
                    reply.raw.write(`event: source\ndata: ${JSON.stringify(verifiedSource)}\n\n`);
                }
            });

            if (!closed) {
                if (resolved.epg) {
                    reply.raw.write(`event: epg\ndata: ${JSON.stringify(resolved.epg)}\n\n`);
                }
                // If none passed the strict probe, still emit fallback mirrors so player can attempt playback
                if (resolved.sources.every((s) => !s.verified)) {
                    for (const fallbackSrc of resolved.sources) {
                        reply.raw.write(`event: source\ndata: ${JSON.stringify(fallbackSrc)}\n\n`);
                    }
                }
                reply.raw.write(
                    `event: done\ndata: ${JSON.stringify({
                        status: 'complete',
                        channelId,
                        masterPlaylistUrl: resolved.masterPlaylistUrl,
                        epg: resolved.epg
                            ? {
                                  nowPlaying: resolved.epg.nowPlaying,
                                  nextUp: resolved.epg.nextUp
                              }
                            : null,
                        count: resolved.sources.length
                    })}\n\n`
                );
                reply.raw.end();
            }
        } catch (err: any) {
            if (!closed) {
                reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: err?.message || 'Error' })}\n\n`);
                reply.raw.end();
            }
        }
    });

    // 5. M3U8 IPTV Playlist Generator for VLC / TiviMate / Web Players
    app.get('/v1/live/playlist.m3u8', async (request: any, reply: any) => {
        const baseUrl = getRequestPublicBaseUrl(request);
        const query = (request.query || {}) as { lang?: string; category?: string; proxy?: string };
        const useProxy = query.proxy !== 'false' && query.proxy !== '0';
        await getLiveSportEvents(baseUrl).catch(() => {});
        const m3u = generateSportsM3UPlaylist(baseUrl, {
            lang: query.lang,
            category: query.category,
            useProxy
        });
        return reply
            .code(200)
            .header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
            .header('Content-Disposition', 'inline; filename="cinepro-live-sports.m3u8"')
            .header('Access-Control-Allow-Origin', '*')
            .send(m3u);
    });

    // 6. CORS-Free Live HLS Manifest & Segment Proxy
    app.get('/v1/live/proxy/manifest.m3u8', async (request: any, reply: any) => {
        const baseUrl = getRequestPublicBaseUrl(request);
        const q = (request.query || {}) as { data?: string; relay?: string; profile?: string };
        return handleLiveHlsProxyRequest(String(q.data || ''), baseUrl, reply, {
            relay: q.relay,
            profile: q.profile
        });
    });

    app.get('/v1/live/proxy/segment.ts', async (request: any, reply: any) => {
        const baseUrl = getRequestPublicBaseUrl(request);
        const q = (request.query || {}) as { data?: string; relay?: string; profile?: string };
        return handleLiveHlsProxyRequest(String(q.data || ''), baseUrl, reply, {
            relay: q.relay,
            profile: q.profile
        });
    });

    await server.start();
    
    const publicUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
    startBackgroundStreamHealthMonitor(publicUrl);
    
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
    const contrib = '🤝 We are looking for contributors to improve and develop!';
    const repo = 'Contribute: https://github.com/cinepro-org/ui';
    const tryIt = `💻 Try it out: ${uiUrl} 💻!`;
    const note = 'You will need to give the website "access to local applications" that it works.';
    const lines = [title, '', repo, '', contrib, '', tryIt, '', note];
    
    // compute box width based on longest line
    const width = Math.max(...lines.map((l) => l.length)) + 2;
    const borderTop = '┌' + '─'.repeat(width) + '┐';
    const borderBottom = '└' + '─'.repeat(width) + '┘';
    const pad = (line: string) => '│ ' + line.padEnd(width - 2, ' ') + ' │';
    
    console.log(`\n\n================== CINEPRO BETA ANNOUNCEMENT ==================\n${borderTop}\n${lines.map(pad).join('\n')}\n${borderBottom}\n\n`);
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
