import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import {
    resolveVidnestV2,
    resolveRiveStreamClean
} from '../../utils/vidnestV2.js';

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
        const season = (media as any).s || (media as any).season || 1;
        const episode = (media as any).e || (media as any).episode || 1;

        try {
            const pageUrl = media.type === 'tv'
                ? `${BASE_URL}/tv/${media.tmdbId}/${season}/${episode}`
                : `${BASE_URL}/movie/${media.tmdbId}`;

            // 1. Fetch token from VidCore using WatchFlix referer
            const pageRes = await fetch(pageUrl, {
                headers: HEADERS,
                signal: AbortSignal.timeout(8000)
            });
            if (!pageRes.ok) return this.fallbackVidVault(media, season, episode);

            const text = await pageRes.text();
            const token = text.match(/\\"?en\\"?\s*:\s*\\"?([a-zA-Z0-9_-]+)\\"?/)?.[1]
                || text.match(/\\\\\"en\\\\\":\\\\\"([a-zA-Z0-9_-]+)\\\\\"/)?.[1]
                || text.match(/\"en\":\"([a-zA-Z0-9_-]+)\"/)?.[1]
                || text.match(/\\"en\\":\\"([a-zA-Z0-9_-]+)\\"/)?.[1];

            if (!token) return this.fallbackVidVault(media, season, episode);

            // 2. Stage 1 Handshake
            const s1Res = await fetch(`${ENC_API}/enc-vidcore?text=${encodeURIComponent(token)}&stage=1`, {
                signal: AbortSignal.timeout(8000)
            });
            const s1Json = (await s1Res.json()) as any;
            if (s1Json.status !== 200 || !s1Json.result?.stage1) {
                return this.fallbackVidVault(media, season, episode);
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
            if (!text1) return this.fallbackVidVault(media, season, episode);

            // 4. Stage 2 Handshake
            const s2Res = await fetch(`${ENC_API}/enc-vidcore?text=${encodeURIComponent(text1)}&stage=2`, {
                signal: AbortSignal.timeout(8000)
            });
            const s2Json = (await s2Res.json()) as any;
            if (s2Json.status !== 200 || !s2Json.result?.servers) {
                return this.fallbackVidVault(media, season, episode);
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

            // 7. Resolve all active English servers in parallel (Supreme, Prime, Orbit, Premiere 4K, Horizon)
            const targetServers = servers.filter((s: any) => s && s.data).slice(0, 5);
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
                        const isM3U8 = !res.mp4 && !res.url.includes('.mp4');
                        const ext = isM3U8 ? '.m3u8' : '.mp4';

                        const proxyHeaders = {
                            'User-Agent': HEADERS['User-Agent'],
                            'Referer': 'https://vidcore.io/',
                            'Origin': 'https://vidcore.io'
                        };
                        const proxyData = JSON.stringify({ url: res.url, headers: proxyHeaders });
                        const proxiedUrl = `http://localhost:3000/v1/proxy?data=${encodeURIComponent(proxyData)}&provider=${this.id}&ext=${ext}`;

                        const serverName = srv.name || 'Core';
                        const serverSlug = serverName.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const srcObj: any = {
                            url: proxiedUrl,
                            quality,
                            type: isM3U8 ? 'hls' : 'mp4',
                            server: serverName,
                            audioTracks: [{ language: 'en', label: 'English' }],
                            provider: {
                                name: `${this.name} (${serverName})`,
                                id: `${this.id}-${serverSlug}`
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
        } catch {
            // Proceed to mirror merge
        }

        const mirrorRes = await this.fallbackVidVault(media, season, episode);
        const { mergeProviderSources } = await import('../../utils/vidnestV2.js');
        return {
            sources: mergeProviderSources(sources, mirrorRes.sources),
            subtitles: mirrorRes.subtitles,
            diagnostics: []
        };
    }

    private async fallbackVidVault(media: ProviderMediaObject, season: number, episode: number): Promise<ProviderResult> {
        (media as any).season = season;
        (media as any).episode = episode;
        (media as any).s = season;
        (media as any).e = episode;

        const { mergeProviderSources } = await import('../../utils/vidnestV2.js');
        const [v2Settled, riveSettled] = await Promise.allSettled([
            resolveVidnestV2(
                media,
                this.id,
                this.name,
                (u, h) => this.createProxyUrl(u, h),
                [
                    { name: 'Supreme HD', path: 'flixhq' },
                    { name: 'Prime Cloud', path: 'nextgencloudfabric' }
                ],
                3000
            ),
            resolveRiveStreamClean(
                media,
                this.id,
                this.name,
                (u, h) => this.createProxyUrl(u, h),
                2800
            )
        ]);

        const v2Sources = v2Settled.status === 'fulfilled' ? v2Settled.value.sources : [];
        const v2Subs = v2Settled.status === 'fulfilled' ? v2Settled.value.subtitles : [];
        const riveSources = riveSettled.status === 'fulfilled' ? riveSettled.value : [];

        return {
            sources: mergeProviderSources(v2Sources, riveSources),
            subtitles: v2Subs,
            diagnostics: []
        };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
