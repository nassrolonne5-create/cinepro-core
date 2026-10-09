import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';

const BASE_URL = 'https://vidcore.io';
const REFERER = 'https://watchflix.bz/';
const ENC_API = 'https://enc-dec.app/api';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Referer': REFERER
};

export class WatchflixProvider extends BaseProvider {
    readonly id = 'watchflix';
    readonly name = 'WatchFlix';
    readonly enabled = true;
    readonly BASE_URL = 'https://watchflix.bz';
    readonly HEADERS = HEADERS;

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const sources: Source[] = [];
        try {
            const pageUrl = media.type === 'tv'
                ? `${BASE_URL}/tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}`
                : `${BASE_URL}/movie/${media.tmdbId}`;

            // 1. Fetch token from VidCore using WatchFlix referer
            const pageRes = await fetch(pageUrl, {
                headers: HEADERS,
                signal: AbortSignal.timeout(8000)
            });
            if (!pageRes.ok) return { sources: [], subtitles: [], diagnostics: [] };

            const text = await pageRes.text();
            const token = text.match(/\\\\\"en\\\\\":\\\\\"([a-zA-Z0-9_-]+)\\\\\"/)?.[1]
                || text.match(/\"en\":\"([a-zA-Z0-9_-]+)\"/)?.[1]
                || text.match(/\\"en\\":\\"([a-zA-Z0-9_-]+)\\"/)?.[1];

            if (!token) return { sources: [], subtitles: [], diagnostics: [] };

            // 2. Stage 1 Handshake
            const s1Res = await fetch(`${ENC_API}/enc-vidcore?text=${encodeURIComponent(token)}&stage=1`, {
                signal: AbortSignal.timeout(8000)
            });
            const s1Json = (await s1Res.json()) as any;
            if (s1Json.status !== 200 || !s1Json.result?.stage1) {
                return { sources: [], subtitles: [], diagnostics: [] };
            }

            const { stage1: stage1Url, token: token1 } = s1Json.result;

            // 3. Post to Stage 1 URL
            const p1Res = await fetch(stage1Url, {
                method: 'POST',
                headers: {
                    ...HEADERS,
                    'Origin': BASE_URL,
                    'Referer': `${BASE_URL}/`,
                    'X-CSRF-Token': token1
                },
                signal: AbortSignal.timeout(8000)
            });
            const text1 = await p1Res.text();
            if (!text1) return { sources: [], subtitles: [], diagnostics: [] };

            // 4. Stage 2 Handshake
            const s2Res = await fetch(`${ENC_API}/enc-vidcore?text=${encodeURIComponent(text1)}&stage=2`, {
                signal: AbortSignal.timeout(8000)
            });
            const s2Json = (await s2Res.json()) as any;
            if (s2Json.status !== 200 || !s2Json.result?.servers) {
                return { sources: [], subtitles: [], diagnostics: [] };
            }

            const { servers: serversUrl, stream: streamUrl, token: token2 } = s2Json.result;

            // 5. Fetch Encrypted Servers
            const srvRes = await fetch(serversUrl, {
                method: 'POST',
                headers: {
                    ...HEADERS,
                    'Origin': BASE_URL,
                    'Referer': `${BASE_URL}/`,
                    'X-CSRF-Token': token2
                },
                signal: AbortSignal.timeout(8000)
            });
            const serversEnc = await srvRes.text();

            // 6. Decrypt Servers
            const decSrvRes = await fetch(`${ENC_API}/dec-vidcore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: serversEnc }),
                signal: AbortSignal.timeout(8000)
            });
            const decSrvJson = (await decSrvRes.json()) as any;
            const servers = Array.isArray(decSrvJson.result) ? decSrvJson.result : [];

            // 7. Resolve top English servers in parallel (Supreme, Prime, Orbit/4K)
            const targetServers = servers.slice(0, 3);
            const serverPromises = targetServers.map(async (srv: any) => {
                if (!srv?.data) return null;
                try {
                    const strRes = await fetch(`${streamUrl}/${srv.data}`, {
                        method: 'POST',
                        headers: {
                            ...HEADERS,
                            'Origin': BASE_URL,
                            'Referer': `${BASE_URL}/`,
                            'X-CSRF-Token': token2
                        },
                        signal: AbortSignal.timeout(4500)
                    });
                    const strEnc = await strRes.text();

                    const decStrRes = await fetch(`${ENC_API}/dec-vidcore`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: strEnc }),
                        signal: AbortSignal.timeout(4500)
                    });
                    const streamData = (await decStrRes.json()) as any;
                    const res = streamData?.result;
                    if (res?.url) {
                        const quality = res['4kAvailable'] || srv.name?.includes('4K') ? '4K' : '1080p';
                        let streamUrl = res.url;

                        if (streamUrl.includes('zenoak.top') || streamUrl.includes('peakpine.top')) {
                            const proxyHeaders = {
                                'User-Agent': HEADERS['User-Agent'],
                                'Referer': 'https://vidcore.io/',
                                'Origin': 'https://vidcore.io'
                            };
                            const proxyData = JSON.stringify({ url: streamUrl, headers: proxyHeaders });
                            streamUrl = `http://localhost:3000/v1/proxy?data=${encodeURIComponent(proxyData)}&provider=${this.id}&ext=.m3u8`;
                        }

                        const srcObj: any = {
                            url: streamUrl,
                            quality,
                            type: getSourceType(res.url, !res.mp4),
                            server: srv.name || 'Core',
                            audioTracks: [{ language: 'en', label: 'English' }],
                            provider: {
                                name: `${this.name} (${srv.name || 'Core'})`,
                                id: this.id
                            }
                        };
                        return srcObj as Source;
                    }
                } catch {
                    return null;
                }
                return null;
            });

            const resolved = await Promise.allSettled(serverPromises);
            for (const r of resolved) {
                if (r.status === 'fulfilled' && r.value) {
                    sources.push(r.value);
                }
            }

            if (sources.length > 0) {
                return { sources, subtitles: [], diagnostics: [] };
            }
        } catch {
            // Proceed to mirror fallback
        }

        // Secondary Upstream Mirror: VidVault High-Speed HD Nodes
        try {
            const bodyPayload = media.type === 'tv'
                ? { type: 'tv', tmdbId: Number(media.tmdbId), season: Number(media.s || 1), episode: Number(media.e || 1) }
                : { type: 'movie', tmdbId: Number(media.tmdbId) };

            const tokenRes = await fetch('https://vidvault.to/api/get-token', {
                headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': 'https://vidvault.ru/' },
                signal: AbortSignal.timeout(4000)
            });
            if (tokenRes.ok) {
                const tokenJson = (await tokenRes.json()) as any;
                if (tokenJson?.t) {
                    const streamRes = await fetch('https://vidvault.to/api/download-proxy', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-request-token': tokenJson.t,
                            'User-Agent': HEADERS['User-Agent'],
                            'Referer': 'https://vidvault.ru/'
                        },
                        body: JSON.stringify(bodyPayload),
                        signal: AbortSignal.timeout(5000)
                    });
                    if (streamRes.ok) {
                        const streamData = (await streamRes.json()) as any;
                        const candidates = [
                            ...(streamData?.mkvV2Data?.url ? [{ ...streamData.mkvV2Data, label: 'Master HD' }] : []),
                            ...(streamData?.mkvData?.url ? [{ ...streamData.mkvData, label: 'Direct HD' }] : []),
                            ...(Array.isArray(streamData?.mp4Data?.links) ? streamData.mp4Data.links.map((l: any) => ({ ...l, label: 'Fast MP4' })) : [])
                        ];
                        for (const item of candidates) {
                            if (!item.url) continue;
                            const proxyData = JSON.stringify({
                                url: item.url,
                                headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': 'https://vidvault.ru/' }
                            });
                            const proxiedUrl = `http://localhost:3000/v1/proxy?data=${encodeURIComponent(proxyData)}&provider=${this.id}&ext=.mp4`;
                            const quality = item.quality ? String(item.quality).replace(/p$/i, '') + 'p' : '1080p';
                            const fbSrc: any = {
                                url: proxiedUrl,
                                quality,
                                type: 'mp4',
                                server: item.label || 'Master HD',
                                audioTracks: [{ language: 'en', label: 'English' }],
                                provider: {
                                    name: `${this.name} (${item.label || 'Master HD'})`,
                                    id: this.id
                                }
                            };
                            sources.push(fbSrc as Source);
                        }
                    }
                }
            }
        } catch {}

        return { sources, subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
