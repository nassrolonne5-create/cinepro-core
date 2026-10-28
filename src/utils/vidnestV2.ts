import crypto from 'node:crypto';
import type { ProviderMediaObject, Source, Subtitle } from '@omss/framework';
import { rivestream, configure } from 'kaizoku-core';
import { getSourceType } from './streamType.js';
import { unwrapAndBuildProxyUrl } from '../providers/rivestream/rivestream.js';

// Ensure kaizoku-core always has a valid TMDB API key configured
try {
    const envKey = process.env.TMDB_API_KEY;
    const tmdbApiKey = (envKey && envKey !== 'fake_key' && envKey !== 'your_tmdb_api_key_here')
        ? envKey
        : '5201b54eb0968700e693a30576d7d4dc';
    configure({ tmdbApiKey });
} catch {}

const VIDNEST_V2_SECRET = 'K3p8vQ2mX9rL5wZ0fN7bG1sH4tJ6dC9_y8S3wM1nQ5pL2';
const VIDNEST_BASE = 'https://new.vidnest.fun';
const VIDNEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Accept': 'application/json, */*',
    'Origin': 'https://vidnest.fun',
    'Referer': 'https://vidnest.fun/'
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const upstreamCache = new Map<string, { data: any; expiresAt: number }>();
const inFlightMap = new Map<string, Promise<any>>();

async function cachedSingleFlight<T>(key: string, fetcher: () => Promise<T>, shouldCache: (val: T) => boolean): Promise<T> {
    const now = Date.now();
    const cached = upstreamCache.get(key);
    if (cached && cached.expiresAt > now) {
        return cached.data as T;
    }
    if (inFlightMap.has(key)) {
        return inFlightMap.get(key)! as Promise<T>;
    }
    const promise = (async () => {
        try {
            const result = await fetcher();
            if (shouldCache(result)) {
                upstreamCache.set(key, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
            }
            return result;
        } finally {
            inFlightMap.delete(key);
        }
    })();
    inFlightMap.set(key, promise);
    return promise;
}

export function getMediaSeasonEpisode(media: ProviderMediaObject): { season: number; episode: number } {
    const season = Number((media as any).season || (media as any).s || 1) || 1;
    const episode = Number((media as any).episode || (media as any).e || 1) || 1;
    (media as any).season = season;
    (media as any).episode = episode;
    (media as any).s = season;
    (media as any).e = episode;
    return { season, episode };
}

export function withVidnestNonce(url: string): string {
    const nonce = crypto.randomBytes(16).toString('base64url');
    return `${url}${url.includes('?') ? '&' : '?'}_n=${encodeURIComponent(nonce)}`;
}

export function decryptVidnestV2(d: string, n: string): any {
    const key = crypto.createHash('sha256').update(`${n}|${VIDNEST_V2_SECRET}`).digest();
    const raw = Buffer.from(d, 'base64url');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(raw.length - 16);
    const ciphertext = raw.subarray(12, raw.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return JSON.parse(dec);
}

const VIDNEST_ALPHABET = 'RB0fpH8ZEyVLkv7c2i6MAJ5u3IKFDxlS1NTsnGaqmXYdUrtzjwObCgQP94hoeW+/=';
const LEGACY_MAP: Record<string, number> = {};
for (let i = 0; i < VIDNEST_ALPHABET.length; i++) LEGACY_MAP[VIDNEST_ALPHABET[i]] = i;

function decodeLegacyVidnestBase64(input: string): string {
    let padded = input;
    const mod = padded.length % 4;
    if (mod !== 0) padded += '='.repeat(4 - mod);
    const bytes: number[] = [];
    for (let i = 0; i < padded.length; i += 4) {
        const chunk = padded.slice(i, i + 4);
        const c0 = LEGACY_MAP[chunk[0]] ?? 64;
        const c1 = LEGACY_MAP[chunk[1]] ?? 64;
        const c2 = chunk[2] === '=' ? 64 : (LEGACY_MAP[chunk[2]] ?? 64);
        const c3 = chunk[3] === '=' ? 64 : (LEGACY_MAP[chunk[3]] ?? 64);
        bytes.push(((c0 << 2) | (c1 >> 4)) & 0xff);
        if (c2 !== 64) bytes.push((((c1 & 0x0f) << 4) | (c2 >> 2)) & 0xff);
        if (c3 !== 64) bytes.push((((c2 & 0x03) << 6) | c3) & 0xff);
    }
    return Buffer.from(bytes).toString('utf8');
}

export function isCleanEnglishStream(url: string, server: string = '', quality: string = ''): boolean {
    const u = (url || '').toLowerCase();
    const s = (server || '').toLowerCase();
    const q = (quality || '').toLowerCase();
    if (!u || (!u.startsWith('http://') && !u.startsWith('https://'))) return false;
    if (
        u.includes('boomchick') ||
        u.includes('streamflix') ||
        u.includes('goodstream.cc') ||
        u.includes('cheaptruckrepairs') ||
        u.includes('rousav.tech') ||
        u.includes('onlinevisibilitysystem.site') ||
        u.includes('highperformanceread.com') ||
        u.includes('aoneroom.com') ||
        u.includes('animanga.fun') ||
        u.includes('tiktoks') ||
        u.includes('480ptvseries') ||
        u.includes('neward.cyou') ||
        u.includes('4pa.top') ||
        u.includes('professionaladvisory.sbs') ||
        u.includes('staticreverie.site') ||
        u.includes('halcyoncreative.site') ||
        u.includes('homechefrecipes.sbs') ||
        u.includes('boltx.stream') ||
        u.includes('bestx.stream') ||
        u.includes('appnumber.top') ||
        u.includes('steman.cyou') ||
        u.includes('hlnom.com') ||
        u.includes('klnwm.com') ||
        u.endsWith('.txt') ||
        u.includes('.txt?') ||
        s.includes('vanguard') ||
        s.includes('apogee') ||
        s.includes('tcloud') ||
        q.includes('hindi') || q.includes('tamil') || q.includes('telugu') || q.includes('punjabi') || q.includes('dublado') || q.includes('latino') ||
        s.includes('hindi') || s.includes('tamil') || s.includes('telugu') || s.includes('punjabi') || s.includes('dublado') || s.includes('latino')
    ) {
        return false;
    }
    return true;
}

export interface VidnestBackendSpec {
    name: string;
    path: string;
}

export const DEFAULT_VIDNEST_BACKENDS: VidnestBackendSpec[] = [
    { name: 'Beta HD', path: 'flixhq' },
    { name: 'Zeta Cloud', path: 'nextgencloudfabric' }
];

async function fetchVidnestBackendRaw(path: string, segment: string, timeoutMs: number): Promise<any | null> {
    const cacheKey = `vidnestv2:${path}:${segment}`;
    return cachedSingleFlight(
        cacheKey,
        async () => {
            try {
                const reqUrl = withVidnestNonce(`${VIDNEST_BASE}/${path}/${segment}`);
                const res = await fetch(reqUrl, {
                    headers: VIDNEST_HEADERS,
                    signal: AbortSignal.timeout(timeoutMs)
                });
                if (!res.ok) return null;
                const json = (await res.json()) as any;
                if (!json) return null;

                let data: any = json;
                if (json.v === 2 && typeof json.d === 'string' && typeof json.n === 'string') {
                    data = decryptVidnestV2(json.d, json.n);
                } else if (json.encrypted && typeof json.data === 'string') {
                    const raw = decodeLegacyVidnestBase64(json.data);
                    data = typeof raw === 'string' ? JSON.parse(raw) : raw;
                } else if (json.data) {
                    data = typeof json.data === 'string' ? JSON.parse(json.data) : json.data;
                }
                return data && typeof data === 'object' ? data : null;
            } catch {
                return null;
            }
        },
        (val) => Boolean(val && (val.url || (Array.isArray(val.streams) && val.streams.length > 0) || (Array.isArray(val.sources) && val.sources.length > 0)))
    );
}

/**
 * Resolves streams from new.vidnest.fun using v2 nonce signing & AES-256-GCM decryption.
 */
export async function resolveVidnestV2(
    media: ProviderMediaObject,
    providerId: string,
    providerName: string,
    createProxyFn: (url: string, headers?: Record<string, string>) => string,
    backends: VidnestBackendSpec[] = DEFAULT_VIDNEST_BACKENDS,
    timeoutMs: number = 3800
): Promise<{ sources: Source[]; subtitles: Subtitle[] }> {
    const { season, episode } = getMediaSeasonEpisode(media);
    const segment = media.type === 'tv'
        ? `tv/${media.tmdbId}/${season}/${episode}`
        : `movie/${media.tmdbId}`;

    const sources: Source[] = [];
    const subtitles: Subtitle[] = [];
    const seenUrls = new Set<string>();

    await Promise.allSettled(backends.map(async (b) => {
        try {
            const data = await fetchVidnestBackendRaw(b.path, segment, timeoutMs);
            if (!data || typeof data !== 'object') return;

            if (Array.isArray(data.subtitles)) {
                for (const sub of data.subtitles) {
                    if (sub?.url && typeof sub.url === 'string' && sub.url.startsWith('http')) {
                        subtitles.push({
                            url: sub.url,
                            language: (sub.lang || sub.language || 'en').slice(0, 2).toLowerCase(),
                            label: sub.lang || sub.label || 'English',
                            format: sub.url.endsWith('.srt') ? 'srt' : 'vtt'
                        } as Subtitle);
                    }
                }
            }

            if (typeof data.url === 'string' && isCleanEnglishStream(data.url, b.name, data.quality)) {
                if (!seenUrls.has(data.url)) {
                    seenUrls.add(data.url);
                    const finalUrl = data.headers && Object.keys(data.headers).length > 0
                        ? createProxyFn(data.url, data.headers)
                        : data.url;
                    sources.push({
                        url: finalUrl,
                        quality: data.quality && data.quality !== 'auto' ? data.quality : '1080p',
                        type: getSourceType(data.url, data.type === 'hls' || data.url.includes('.m3u8') || data.url.includes('/hls/')),
                        server: b.name,
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: `${providerName} (${b.name})`,
                            id: `${providerId}-${b.path}`
                        }
                    });
                }

                if (data.url.includes('/hls/')) {
                    try {
                        const b64Part = data.url.split('/hls/')[1]?.split('/')[0];
                        if (b64Part) {
                            const decodedInner = JSON.parse(Buffer.from(b64Part, 'base64url').toString('utf8'));
                            const innerHeaders = decodedInner?.h || { Referer: 'https://www.movy.sx/' };
                            if (Array.isArray(decodedInner?.v)) {
                                for (const v of decodedInner.v) {
                                    if (v?.u && isCleanEnglishStream(v.u, b.name, v.q) && !seenUrls.has(v.u)) {
                                        seenUrls.add(v.u);
                                        const qLabel = v.q === '2160p' ? '4K' : (v.q || '1080p');
                                        const sLabel = `${b.name} ${qLabel}`;
                                        const proxied = createProxyFn(v.u, innerHeaders);
                                        sources.push({
                                            url: proxied,
                                            quality: qLabel,
                                            type: 'hls',
                                            server: sLabel,
                                            audioTracks: [{ language: 'en', label: 'English' }],
                                            provider: {
                                                name: `${providerName} (${sLabel})`,
                                                id: `${providerId}-${b.path}-${qLabel.toLowerCase()}`
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    } catch {}
                }
            }

            const streamArr = Array.isArray(data.streams)
                ? data.streams
                : (Array.isArray(data.sources) ? data.sources : []);

            let idx = 0;
            for (const s of streamArr) {
                const rawUrl = s?.url || s?.file || s?.link;
                const q = s?.quality || s?.language || '1080p';
                if (!rawUrl || !isCleanEnglishStream(rawUrl, b.name, q)) continue;
                if (seenUrls.has(rawUrl)) continue;
                seenUrls.add(rawUrl);
                idx++;

                const sHeaders = s.headers || data.headers || {};
                const finalUrl = Object.keys(sHeaders).length > 0
                    ? createProxyFn(rawUrl, sHeaders)
                    : rawUrl;
                const sLabel = idx === 1 ? b.name : `${b.name} ${idx}`;
                sources.push({
                    url: finalUrl,
                    quality: q === 'auto' ? '1080p' : q,
                    type: getSourceType(rawUrl, s.type === 'hls' || rawUrl.includes('.m3u8')),
                    server: sLabel,
                    audioTracks: [{ language: 'en', label: 'English' }],
                    provider: {
                        name: `${providerName} (${sLabel})`,
                        id: `${providerId}-${b.path}-${idx}`
                    }
                });
            }
        } catch {}
    }));

    return { sources, subtitles };
}

/**
 * Resolves native 2-stage encrypted streams from vidup.to (Euro, CineX, Zenith, Premier, Eclipse)
 */
export async function resolveVidupNative(
    media: ProviderMediaObject,
    providerId: string,
    providerName: string,
    createProxyFn: (url: string, headers?: Record<string, string>) => string,
    timeoutMs: number = 4200
): Promise<{ sources: Source[]; subtitles: Subtitle[] }> {
    const { season, episode } = getMediaSeasonEpisode(media);
    const segmentKey = media.type === 'tv' ? `tv:${media.tmdbId}:${season}:${episode}` : `movie:${media.tmdbId}`;
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
    const BASE = 'https://vidup.to';
    const ENC_API = 'https://enc-dec.app/api';

    const rawItems = await cachedSingleFlight(
        `vidup:${segmentKey}`,
        async () => {
            const list: Array<{ serverName: string; url: string; mp4: boolean; is4k: boolean; tracks: any[] }> = [];
            try {
                const embedUrl = media.type === 'tv'
                    ? `${BASE}/tv/${media.tmdbId}/${season}/${episode}/`
                    : `${BASE}/movie/${media.tmdbId}/`;

                const pageRes = await fetch(embedUrl, {
                    headers: { 'User-Agent': UA, 'Referer': `${BASE}/` },
                    signal: AbortSignal.timeout(timeoutMs)
                });
                if (!pageRes.ok) return list;

                const html = await pageRes.text();
                const token = (
                    html.match(/\\"en\\":\\"([a-zA-Z0-9_-]+)\\"/) ||
                    html.match(/"en":"([a-zA-Z0-9_-]+)"/) ||
                    html.match(/"en":"([^"]+)"/)
                )?.[1];
                if (!token) return list;

                const xhrHeaders = {
                    'User-Agent': UA,
                    'Referer': `${BASE}/`,
                    'X-Requested-With': 'XMLHttpRequest'
                };

                const s1Res = await fetch(`${ENC_API}/enc-vidup?text=${encodeURIComponent(token)}&stage=1`, {
                    signal: AbortSignal.timeout(2500)
                });
                const s1Json = (await s1Res.json()) as any;
                if (s1Json.status !== 200 || !s1Json.result?.stage1) return list;

                const { stage1: stage1Url, token: token1 } = s1Json.result;
                const p1Res = await fetch(stage1Url, {
                    method: 'POST',
                    headers: { ...xhrHeaders, 'X-CSRF-Token': token1 },
                    signal: AbortSignal.timeout(2500)
                });
                const text1 = await p1Res.text();
                if (!text1) return list;

                const s2Res = await fetch(`${ENC_API}/enc-vidup?text=${encodeURIComponent(text1)}&stage=2`, {
                    signal: AbortSignal.timeout(2500)
                });
                const s2Json = (await s2Res.json()) as any;
                if (s2Json.status !== 200 || !s2Json.result?.servers) return list;

                const { servers: serversUrl, stream: streamUrl, token: token2 } = s2Json.result;
                const srvRes = await fetch(serversUrl, {
                    method: 'POST',
                    headers: { ...xhrHeaders, 'X-CSRF-Token': token2 },
                    signal: AbortSignal.timeout(2500)
                });
                const serversEnc = await srvRes.text();

                const decSrvRes = await fetch(`${ENC_API}/dec-vidup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: serversEnc }),
                    signal: AbortSignal.timeout(2500)
                });
                const decSrvJson = (await decSrvRes.json()) as any;
                const servers = Array.isArray(decSrvJson.result) ? decSrvJson.result.slice(0, 5) : [];

                const resolved = await Promise.allSettled(servers.map(async (srv: any) => {
                    if (!srv?.data) return null;
                    try {
                        const strRes = await fetch(`${streamUrl}/${srv.data}`, {
                            method: 'POST',
                            headers: { ...xhrHeaders, 'X-CSRF-Token': token2 },
                            signal: AbortSignal.timeout(2500)
                        });
                        const strEnc = await strRes.text();
                        const decStrRes = await fetch(`${ENC_API}/dec-vidup`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: strEnc }),
                            signal: AbortSignal.timeout(2500)
                        });
                        const streamData = (await decStrRes.json()) as any;
                        const res = streamData?.result;
                        if (!res?.url || !isCleanEnglishStream(res.url, srv.name)) return null;
                        return {
                            serverName: srv.name || 'Euro',
                            url: String(res.url),
                            mp4: Boolean(res.mp4),
                            is4k: Boolean(res['4kAvailable']),
                            tracks: Array.isArray(res.tracks) ? res.tracks : []
                        };
                    } catch {
                        return null;
                    }
                }));

                for (const r of resolved) {
                    if (r.status === 'fulfilled' && r.value) {
                        list.push(r.value);
                    }
                }
            } catch {}
            return list;
        },
        (val) => Array.isArray(val) && val.length > 0
    );

    const sources: Source[] = [];
    const subtitles: Subtitle[] = [];

    for (const item of rawItems) {
        for (const t of item.tracks) {
            if (t?.file && typeof t.file === 'string' && t.file.startsWith('http')) {
                subtitles.push({
                    url: t.file,
                    language: (t.label || 'en').slice(0, 2).toLowerCase(),
                    label: t.label || 'English',
                    format: 'vtt'
                } as Subtitle);
            }
        }

        let finalUrl = item.url;
        if (finalUrl.includes('zenoak.top') || finalUrl.includes('peakpine.top')) {
            finalUrl = createProxyFn(finalUrl, {
                'User-Agent': UA,
                'Referer': `${BASE}/`,
                'Origin': BASE
            });
        }

        const quality = item.is4k || item.serverName.includes('4K') ? '4K' : '1080p';
        sources.push({
            url: finalUrl,
            quality,
            type: getSourceType(item.url, !item.mp4),
            server: item.serverName,
            audioTracks: [{ language: 'en', label: 'English' }],
            provider: {
                name: `${providerName} (${item.serverName})`,
                id: `${providerId}-${item.serverName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
            }
        });
    }

    return { sources, subtitles };
}

/**
 * Resolves clean, unwrapped English streams from RiveStream with strict filtering and single-flight caching.
 */
export async function resolveRiveStreamClean(
    media: ProviderMediaObject,
    providerId: string,
    providerName: string,
    createProxyFn: (url: string, headers?: Record<string, string>) => string,
    timeoutMs: number = 3500
): Promise<Source[]> {
    const { season, episode } = getMediaSeasonEpisode(media);
    const segmentKey = media.type === 'tv' ? `tv:${media.tmdbId}:${season}:${episode}` : `movie:${media.tmdbId}`;

    const rawData = await cachedSingleFlight(
        `rivestream:${segmentKey}`,
        async () => {
            try {
                const data: any = await Promise.race([
                    rivestream.fetchSources(media.tmdbId, media.type, season, episode),
                    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs))
                ]);
                return data && Array.isArray(data.sources) && data.sources.length > 0 ? data : null;
            } catch {
                return null;
            }
        },
        (val) => Boolean(val && Array.isArray(val.sources) && val.sources.length > 0)
    );

    const sources: Source[] = [];
    const seen = new Set<string>();

    if (rawData && Array.isArray(rawData.sources)) {
        const defaultHeaders = rawData.headers || {};
        for (const src of rawData.sources) {
            if (!src?.url) continue;
            if (!isCleanEnglishStream(src.url, src.server, src.quality)) continue;
            if (seen.has(src.url)) continue;
            seen.add(src.url);

            const streamHeaders = src.headers || defaultHeaders;
            const unwrappedUrl = unwrapAndBuildProxyUrl(
                src.url,
                streamHeaders,
                createProxyFn
            );

            const sLabel = src.server || 'Mirage';
            sources.push({
                url: unwrappedUrl,
                quality: src.quality || '1080p',
                type: getSourceType(src.url, src.isM3U8),
                server: sLabel,
                audioTracks: [{ language: 'en', label: 'English' }],
                provider: {
                    name: `${providerName} (${sLabel})`,
                    id: `${providerId}-${sLabel.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                }
            });
        }
    }

    return sources;
}
