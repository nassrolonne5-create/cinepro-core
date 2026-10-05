import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidnest } from 'kaizoku-core';
import { getSourceType } from '../../utils/streamType.js';

export class IcefyProvider extends BaseProvider {
    readonly id = 'Icefy';
    readonly name = 'Icefy';
    readonly enabled = true;
    readonly BASE_URL = 'https://streams.icefy.top';
    readonly HEADERS = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150 Safari/537.36',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://streams.icefy.top/',
        Origin: 'https://streams.icefy.top'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.getSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.getSources(media);
    }

    private async getSources(media: ProviderMediaObject): Promise<ProviderResult> {
        // 1. Try native Icefy
        try {
            const apiUrl = media.type === 'movie'
                ? `${this.BASE_URL}/movie/${media.tmdbId}`
                : `${this.BASE_URL}/tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}`;

            const response = await fetch(apiUrl, {
                headers: this.HEADERS,
                signal: AbortSignal.timeout(4000)
            });

            if (response.ok) {
                const data = (await response.json()) as any;
                if (data?.stream) {
                    return {
                        sources: [{
                            url: this.createProxyUrl(data.stream, this.HEADERS),
                            quality: '1080p',
                            type: 'hls',
                            audioTracks: [{ language: 'en', label: 'English' }],
                            provider: {
                                name: this.name,
                                id: this.id
                            }
                        }],
                        subtitles: [],
                        diagnostics: []
                    };
                }
            }
        } catch {}

        // 2. High-speed resilient fallback
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
