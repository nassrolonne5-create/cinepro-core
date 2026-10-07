import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidnest } from 'kaizoku-core';

const BASE_URL = 'https://vidfast.vc';
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
        return this.fetchSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    private async resolveVidfast(media: ProviderMediaObject): Promise<Source[]> {
        const sources: Source[] = [];
        try {
            const embedUrl = media.type === 'tv'
                ? `${BASE_URL}/tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}/`
                : `${BASE_URL}/movie/${media.tmdbId}/`;

            const pageRes = await fetch(embedUrl, {
                headers: {
                    'User-Agent': HEADERS['User-Agent'],
                    'Referer': `${BASE_URL}/`
                },
                signal: AbortSignal.timeout(8000)
            });
            if (!pageRes.ok) return [];

            const html = await pageRes.text();
            const tokenMatch = html.match(/\\"en\\":\\"([a-zA-Z0-9_-]+)\\"/) || html.match(/"en":"([a-zA-Z0-9_-]+)"/);
            if (!tokenMatch?.[1]) return [];
            const token = tokenMatch[1];

            // Stage 1 Encryption
            const s1Res = await fetch(`${ENC_API}/enc-vidfast?text=${encodeURIComponent(token)}&stage=1`, {
                signal: AbortSignal.timeout(8000)
            });
            const s1Json = (await s1Res.json()) as any;
            if (s1Json.status !== 200 || !s1Json.result?.stage1) return [];

            const { stage1: stage1Url, token: token1 } = s1Json.result;

            // Post Stage 1
            const p1Res = await fetch(stage1Url, {
                method: 'POST',
                headers: { ...HEADERS, 'X-CSRF-Token': token1 },
                signal: AbortSignal.timeout(8000)
            });
            const text1 = await p1Res.text();
            if (!text1) return [];

            // Stage 2 Encryption
            const s2Res = await fetch(`${ENC_API}/enc-vidfast?text=${encodeURIComponent(text1)}&stage=2`, {
                signal: AbortSignal.timeout(8000)
            });
            const s2Json = (await s2Res.json()) as any;
            if (s2Json.status !== 200 || !s2Json.result?.servers) return [];

            const { servers: serversUrl, stream: streamUrl, token: token2 } = s2Json.result;

            // Fetch Servers
            const srvRes = await fetch(serversUrl, {
                method: 'POST',
                headers: { ...HEADERS, 'X-CSRF-Token': token2 },
                signal: AbortSignal.timeout(8000)
            });
            const serversEnc = await srvRes.text();

            // Decrypt Servers
            const decSrvRes = await fetch(`${ENC_API}/dec-vidfast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: serversEnc }),
                signal: AbortSignal.timeout(8000)
            });
            const decSrvJson = (await decSrvRes.json()) as any;
            const servers = Array.isArray(decSrvJson.result) ? decSrvJson.result : [];

            // Resolve streams in parallel (top 4 servers)
            const targetServers = servers.slice(0, 4);
            const serverPromises = targetServers.map(async (srv: any) => {
                if (!srv?.data) return null;
                try {
                    const strRes = await fetch(`${streamUrl}/${srv.data}`, {
                        method: 'POST',
                        headers: { ...HEADERS, 'X-CSRF-Token': token2 },
                        signal: AbortSignal.timeout(8000)
                    });
                    const strEnc = await strRes.text();

                    const decStrRes = await fetch(`${ENC_API}/dec-vidfast`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: strEnc }),
                        signal: AbortSignal.timeout(8000)
                    });
                    const streamData = (await decStrRes.json()) as any;
                    const res = streamData?.result;
                    if (res?.url) {
                        const quality = res['4kAvailable'] ? '4K' : (srv.name?.includes('4K') ? '4K' : '1080p');
                        return {
                            url: res.url,
                            quality,
                            type: getSourceType(res.url, !res.mp4),
                            audioTracks: [{ language: 'en', label: 'English' }],
                            provider: {
                                name: `${this.name} (${srv.name || 'Fast'})`,
                                id: this.id
                            }
                        };
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
            // Fail gracefully
        }
        return sources;
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        // 1. Try native 2-stage decrypted vidfast.vc stream
        try {
            const nativeSources = await this.resolveVidfast(media);
            if (nativeSources.length > 0) {
                return { sources: nativeSources, subtitles: [], diagnostics: [] };
            }
        } catch {}

        // 2. High-speed fallback via vidnest mirror
        try {
            const data = await vidnest.fetchSources(media.tmdbId, media.type, media.s, media.e);
            if (data?.sources?.length) {
                const sources: Source[] = data.sources.map(src => {
                    const ext = src.isM3U8 || src.url.includes('.m3u8') ? '.m3u8' : '.mp4';
                    return {
                        url: src.url + (src.url.includes('?') ? '&' : '?') + 'provider=' + this.id + '&ext=' + ext,
                        quality: src.quality || 'auto',
                        type: getSourceType(src.url, src.isM3U8),
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: this.name,
                            id: this.id
                        }
                    };
                });
                return { sources, subtitles: [], diagnostics: [] };
            }
        } catch {}

        return { sources: [], subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
