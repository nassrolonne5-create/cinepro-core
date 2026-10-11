import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidrock } from 'kaizoku-core';
import { getVidVaultToken } from '../../utils/vidvaultToken.js';

export class VidrockProvider extends BaseProvider {
    readonly id = 'vidrock';
    readonly name = 'VidRock';
    readonly enabled = true;
    readonly BASE_URL = '';
    readonly HEADERS = {};
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
        const timeout = (ms: number) => new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));

        // Fetch primary VidRock nodes and Mirror HD in parallel for maximum speed
        const [nativeResult, mirrorResult] = await Promise.allSettled([
            // 1. Native VidRock API (Atlas, Luna, Orion) with 6.5s timeout
            (async () => {
                const data: any = await Promise.race([
                    vidrock.fetchSources(media.tmdbId, media.type, media.s, media.e),
                    timeout(6500)
                ]);
                const headers = data?.headers || {};
                const list: Source[] = [];

                const rawCandidates = (data?.sources || []).filter((src: any) => {
                    const uLower = (src.url || '').toLowerCase();
                    if (uLower.includes('boomchick') || uLower.includes('streamflix')) {
                        return false;
                    }
                    return true;
                });

                for (const src of rawCandidates) {
                    const srvName = src.server || 'Orion';
                    const srvId = `${this.id}-${srvName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                    const url = Object.keys(headers).length > 0 ? this.createProxyUrl(src.url, headers) : src.url;
                    list.push({
                        url,
                        quality: src.quality || 'Auto',
                        type: src.isM3U8 || src.url.includes('.m3u8') ? 'hls' : 'mp4',
                        server: srvName,
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: `${this.name} (${srvName})`,
                            id: srvId
                        }
                    } as Source);
                }
                return list;
            })(),

            // 2. High-speed Mirror HD node with cached token
            (async () => {
                const bodyPayload = media.type === 'tv'
                    ? { type: 'tv', tmdbId: Number(media.tmdbId), season: Number(media.s || 1), episode: Number(media.e || 1) }
                    : { type: 'movie', tmdbId: Number(media.tmdbId) };

                const token = await getVidVaultToken();
                if (!token) return [];

                const streamRes = await fetch('https://vidvault.to/api/download-proxy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-request-token': token,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        'Referer': 'https://vidvault.ru/'
                    },
                    body: JSON.stringify(bodyPayload),
                    signal: AbortSignal.timeout(4000)
                });
                if (streamRes.ok) {
                    const streamData = (await streamRes.json()) as any;
                    const fallbackUrl = streamData?.mkvV2Data?.url || streamData?.mkvData?.url;
                    if (fallbackUrl) {
                        const proxyData = JSON.stringify({
                            url: fallbackUrl,
                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://vidvault.ru/' }
                        });
                        const proxiedUrl = `/v1/proxy?data=${encodeURIComponent(proxyData)}&provider=${this.id}&ext=.mp4`;
                        return [{
                            url: proxiedUrl,
                            quality: '1080p',
                            type: 'mp4',
                            server: 'Mirror HD',
                            audioTracks: [{ language: 'en', label: 'English' }],
                            provider: {
                                name: `${this.name} (Mirror HD)`,
                                id: `${this.id}-mirrorhd`
                            }
                        } as Source];
                    }
                }
                return [];
            })()
        ]);

        if (nativeResult.status === 'fulfilled' && Array.isArray(nativeResult.value)) {
            sources.push(...nativeResult.value);
        }
        if (mirrorResult.status === 'fulfilled' && Array.isArray(mirrorResult.value)) {
            sources.push(...mirrorResult.value);
        }

        return { sources, subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
