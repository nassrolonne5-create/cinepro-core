import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { purstream } from 'kaizoku-core';

export class VidVaultProvider extends BaseProvider {
    readonly id = 'vidvault';
    readonly name = 'VidVault';
    readonly enabled = true;
    readonly BASE_URL = 'https://vidvault.ru';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Referer': 'https://vidvault.ru/'
    };

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
            // 1. Native direct resolution via VidVault backend API
            const tokenRes = await fetch('https://vidvault.to/api/get-token', {
                headers: {
                    'User-Agent': this.HEADERS['User-Agent'],
                    'Referer': 'https://vidvault.ru/'
                },
                signal: AbortSignal.timeout(6000)
            });
            if (tokenRes.ok) {
                const tokenJson = (await tokenRes.json()) as any;
                const token = tokenJson?.t;
                if (token) {
                    const bodyPayload = media.type === 'tv'
                        ? { type: 'tv', tmdbId: Number(media.tmdbId), season: Number(media.s || 1), episode: Number(media.e || 1) }
                        : { type: 'movie', tmdbId: Number(media.tmdbId) };

                    const streamRes = await fetch('https://vidvault.to/api/download-proxy', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-request-token': token,
                            'User-Agent': this.HEADERS['User-Agent'],
                            'Referer': 'https://vidvault.ru/'
                        },
                        body: JSON.stringify(bodyPayload),
                        signal: AbortSignal.timeout(8000)
                    });
                    if (streamRes.ok) {
                        const streamData = (await streamRes.json()) as any;
                        const candidates: any[] = [];
                        if (streamData?.mkvV2Data?.url) {
                            candidates.push({ ...streamData.mkvV2Data, label: 'Master HD' });
                        }
                        if (streamData?.mkvData?.url) {
                            candidates.push({ ...streamData.mkvData, label: 'Direct HD' });
                        }
                        if (Array.isArray(streamData?.mp4Data?.links)) {
                            for (const l of streamData.mp4Data.links) {
                                if (l?.url) candidates.push({ ...l, label: 'Fast MP4' });
                            }
                        }

                        for (const item of candidates) {
                            if (!item.url) continue;
                            const headers = {
                                'User-Agent': this.HEADERS['User-Agent'],
                                'Referer': 'https://vidvault.ru/'
                            };
                            const proxyData = JSON.stringify({ url: item.url, headers });
                            const proxiedUrl = `/v1/proxy?data=${encodeURIComponent(proxyData)}&provider=${this.id}&ext=.mp4`;
                            const quality = item.quality ? String(item.quality).replace(/p$/i, '') + 'p' : '1080p';

                            sources.push({
                                url: proxiedUrl,
                                quality,
                                type: 'mp4',
                                audioTracks: [{ language: 'en', label: 'English' }],
                                provider: {
                                    name: `${this.name} (${item.label || 'Direct'})`,
                                    id: this.id
                                }
                            });
                        }
                    }
                }
            }
        } catch {}

        // Fallback to PurStream if needed
        if (sources.length === 0) {
            try {
                const data = await purstream.fetchSources(media.tmdbId, media.type, media.s, media.e);
                if (data && Array.isArray(data.sources)) {
                    for (const src of data.sources) {
                        sources.push({
                            url: src.url,
                            quality: src.quality || 'auto',
                            type: getSourceType(src.url, src.isM3U8),
                            audioTracks: [{ language: 'en', label: 'English' }],
                            provider: {
                                name: this.name,
                                id: this.id
                            }
                        });
                    }
                }
            } catch {}
        }

        return { sources, subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
