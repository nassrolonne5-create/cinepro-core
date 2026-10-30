import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source,
    Subtitle
} from '@omss/framework';
import { vidnest, rivestream } from 'kaizoku-core';

const DOMAIN_MESH = [
    'https://vidfast.vc',
    'https://vidfast.pro',
    'https://vidfast.in',
    'https://vidfast.io',
    'https://vidfast.net'
];
const BASE_URL = DOMAIN_MESH[0];
const ENC_API = 'https://enc-dec.app/api';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Referer': 'https://vidfast.vc/',
    'X-Requested-With': 'XMLHttpRequest'
};

export class VidfastProvider extends BaseProvider {
    readonly id = 'vidfast';
    readonly name = 'VidFast';
    readonly enabled = true;
    readonly BASE_URL = BASE_URL;
    readonly HEADERS = HEADERS;

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 10000)
            )
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 10000)
            )
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    private async callWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
        try {
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), ms)
            );
            return await Promise.race([promise, timeout]);
        } catch {
            return null;
        }
    }

    private async fetchSubtitles(media: ProviderMediaObject, activeBaseUrl: string): Promise<Subtitle[]> {
        try {
            const query = media.type === 'tv'
                ? `id=${media.tmdbId}&season=${media.s || 1}&episode=${media.e || 1}`
                : `id=${media.tmdbId}`;
            const res = await fetch(`${activeBaseUrl}/wyzie?${query}`, {
                headers: HEADERS,
                signal: AbortSignal.timeout(2500)
            });
            if (!res.ok) return [];
            const data = (await res.json()) as any[];
            if (!Array.isArray(data)) return [];
            return data.map(sub => ({
                language: sub.language || 'en',
                label: sub.display || sub.language || 'Subtitle',
                url: sub.url,
                format: 'vtt'
            }));
        } catch {
            return [];
        }
    }

    private async resolveVidfast(media: ProviderMediaObject, activeBaseUrl: string): Promise<Source[]> {
        const sources: Source[] = [];
        try {
            const embedUrl = media.type === 'tv'
                ? `${activeBaseUrl}/tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}/`
                : `${activeBaseUrl}/movie/${media.tmdbId}/`;

            const pageRes = await fetch(embedUrl, {
                headers: {
                    'User-Agent': HEADERS['User-Agent'],
                    'Referer': `${activeBaseUrl}/`
                },
                signal: AbortSignal.timeout(3500)
            });
            if (!pageRes.ok) return [];

            const html = await pageRes.text();
            const tokenMatch = html.match(/\\"en\\":\\"([a-zA-Z0-9_-]+)\\"/) || 
                               html.match(/"en":"([a-zA-Z0-9_-]+)"/) ||
                               html.match(/"en":"([^"]+)"/);
            if (!tokenMatch?.[1]) return [];
            const token = tokenMatch[1];

            // Stage 1 Encryption
            const s1Res = await fetch(`${ENC_API}/enc-vidfast?text=${encodeURIComponent(token)}&stage=1`, {
                signal: AbortSignal.timeout(3000)
            });
            const s1Json = (await s1Res.json()) as any;
            if (s1Json.status !== 200 || !s1Json.result?.stage1) return [];

            const { stage1: stage1Url, token: token1 } = s1Json.result;

            // Post Stage 1
            const p1Res = await fetch(stage1Url, {
                method: 'POST',
                headers: { ...HEADERS, 'X-CSRF-Token': token1 },
                signal: AbortSignal.timeout(3000)
            });
            const text1 = await p1Res.text();
            if (!text1) return [];

            // Stage 2 Encryption
            const s2Res = await fetch(`${ENC_API}/enc-vidfast?text=${encodeURIComponent(text1)}&stage=2`, {
                signal: AbortSignal.timeout(3000)
            });
            const s2Json = (await s2Res.json()) as any;
            if (s2Json.status !== 200 || !s2Json.result?.servers) return [];

            const { servers: serversUrl, stream: streamUrl, token: token2 } = s2Json.result;

            // Fetch Servers
            const srvRes = await fetch(serversUrl, {
                method: 'POST',
                headers: { ...HEADERS, 'X-CSRF-Token': token2 },
                signal: AbortSignal.timeout(3000)
            });
            const serversEnc = await srvRes.text();

            // Decrypt Servers
            const decSrvRes = await fetch(`${ENC_API}/dec-vidfast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: serversEnc }),
                signal: AbortSignal.timeout(3000)
            });
            const decSrvJson = (await decSrvRes.json()) as any;
            const servers = Array.isArray(decSrvJson.result) ? decSrvJson.result : [];

            // Resolve streams in parallel across all available servers (prioritizing Bravo, Cobra, vRapid, etc.)
            const targetServers = servers;
            const serverPromises = targetServers.map(async (srv: any) => {
                if (!srv?.data) return null;
                try {
                    const strRes = await fetch(`${streamUrl}/${srv.data}`, {
                        method: 'POST',
                        headers: { ...HEADERS, 'X-CSRF-Token': token2 },
                        signal: AbortSignal.timeout(3000)
                    });
                    const strEnc = await strRes.text();

                    const decStrRes = await fetch(`${ENC_API}/dec-vidfast`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: strEnc }),
                        signal: AbortSignal.timeout(3000)
                    });
                    const streamData = (await decStrRes.json()) as any;
                    const res = streamData?.result;
                    if (res?.url) {
                        const quality = res['4kAvailable'] ? '4K' : (srv.name?.includes('4K') ? '4K' : '1080p');
                        
                        let streamUrl = res.url;
                        if (streamUrl.includes('zenoak.top') || streamUrl.includes('peakpine.top')) {
                            const requiredHeaders = {
                                'User-Agent': HEADERS['User-Agent'],
                                'Referer': `${activeBaseUrl}/`,
                                'Origin': activeBaseUrl
                            };
                            const proxyData = JSON.stringify({ url: streamUrl, headers: requiredHeaders });
                            streamUrl = `/v1/proxy?data=${encodeURIComponent(proxyData)}&provider=${this.id}&ext=.m3u8`;
                        }

                        const serverName = srv.name || 'Bravo';
                        const serverId = `${this.id}-${serverName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

                        const srcObj: any = {
                            url: streamUrl,
                            quality,
                            type: getSourceType(res.url, !res.mp4),
                            server: serverName,
                            audioTracks: [{ language: 'en', label: 'English' }],
                            provider: {
                                name: `${this.name} (${serverName})`,
                                id: serverId
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

            // Ensure VidFast (Bravo) is always included for the frontend
            const hasBravo = sources.some(s => s.server === 'Bravo' || (s.provider?.name && s.provider.name.includes('Bravo')));
            if (!hasBravo && sources.length > 0) {
                const primary = sources[0];
                sources.unshift({
                    ...primary,
                    server: 'Bravo',
                    provider: {
                        name: `${this.name} (Bravo)`,
                        id: `${this.id}-bravo`
                    }
                });
            }
        } catch {
            // Fail gracefully
        }
        return sources;
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        (media as any).s = Number((media as any).season || (media as any).s || 1);
        (media as any).e = Number((media as any).episode || (media as any).e || 1);
        const activeDomain = BASE_URL;

        const { resolveRiveStreamClean, resolveVidnestV2, mergeProviderSources } = await import('../../utils/vidnestV2.js');

        const nativeTask = this.callWithTimeout(
            this.resolveVidfast(media, activeDomain),
            3500
        ).catch(() => [] as Source[]);

        const riveTask = resolveRiveStreamClean(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            2800
        ).catch(() => [] as Source[]);

        const v2Task = resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'Bravo', path: 'flixhq' },
                { name: 'Cobra', path: 'nextgencloudfabric' }
            ],
            2800
        ).catch(() => ({ sources: [] as Source[], subtitles: [] }));

        const [nativeSources, riveSources, v2] = await Promise.all([nativeTask, riveTask, v2Task]);
        const merged = mergeProviderSources(nativeSources || [], v2.sources, riveSources);

        return { sources: merged, subtitles: v2.subtitles || [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
