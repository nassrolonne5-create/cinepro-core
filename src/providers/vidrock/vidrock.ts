import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidrock } from 'kaizoku-core';

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
        try {
            const data = await vidrock.fetchSources(media.tmdbId, media.type, media.s, media.e);
            const headers = data.headers || {};
            const sources: Source[] = [];

            const rawCandidates = (data.sources || []).filter((src: any) => {
                const uLower = (src.url || '').toLowerCase();
                const sLower = (src.server || '').toLowerCase();
                if (uLower.includes('boomchick') || sLower.includes('atlas') || uLower.includes('streamflix')) {
                    return false;
                }
                return true;
            });

            // Pre-validate streams concurrently with a fast ping to weed out 403 / bot-blocked CDN hosts (e.g. staticreverie)
            const validationPromises = rawCandidates.map(async (src: any) => {
                let isAlive = true;
                try {
                    const ping = await fetch(src.url, {
                        method: 'GET',
                        headers: { ...headers, Range: 'bytes=0-50' },
                        signal: AbortSignal.timeout(2500)
                    });
                    if (ping.status >= 400) {
                        isAlive = false;
                    }
                } catch {
                    // In case of ping timeout, keep if no 4xx was explicitly returned
                }
                return { src, isAlive };
            });

            const checkedSources = await Promise.all(validationPromises);
            const liveSources = checkedSources.filter(s => s.isAlive).map(s => s.src);
            const finalCandidates = liveSources.length > 0 ? liveSources : (data.sources || []);

            for (const src of finalCandidates) {
                const url = Object.keys(headers).length > 0 ? this.createProxyUrl(src.url, headers) : src.url;
                sources.push({
                    url,
                    quality: src.quality || 'Auto',
                    type: src.isM3U8 || src.url.includes('.m3u8') ? 'hls' : 'mp4',
                    audioTracks: [{ language: 'en', label: 'English' }],
                    provider: {
                        name: src.server ? `${this.name} (${src.server})` : this.name,
                        id: this.id
                    }
                });
            }
            if (sources.length > 0) {
                return { sources, subtitles: [], diagnostics: [] };
            }
        } catch {}

        // Fallback mirror if primary VidRock server is empty
        try {
            const bodyPayload = media.type === 'tv'
                ? { type: 'tv', tmdbId: Number(media.tmdbId), season: Number(media.s || 1), episode: Number(media.e || 1) }
                : { type: 'movie', tmdbId: Number(media.tmdbId) };

            const tokenRes = await fetch('https://vidvault.to/api/get-token', {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://vidvault.ru/' },
                signal: AbortSignal.timeout(3000)
            });
            if (tokenRes.ok) {
                const tokenJson = (await tokenRes.json()) as any;
                if (tokenJson?.t) {
                    const streamRes = await fetch('https://vidvault.to/api/download-proxy', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-request-token': tokenJson.t,
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
                            const proxiedUrl = `http://localhost:3000/v1/proxy?data=${encodeURIComponent(proxyData)}&provider=${this.id}&ext=.mp4`;
                            const srcObj: any = {
                                url: proxiedUrl,
                                quality: '1080p',
                                type: 'mp4',
                                server: 'Mirror HD',
                                audioTracks: [{ language: 'en', label: 'English' }],
                                provider: {
                                    name: `${this.name} (Mirror HD)`,
                                    id: this.id
                                }
                            };
                            return { sources: [srcObj as Source], subtitles: [], diagnostics: [] };
                        }
                    }
                }
            }
        } catch {}

        return { sources: [], subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
