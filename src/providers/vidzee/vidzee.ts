import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidzee, vidnest } from 'kaizoku-core';

export class VidzeeProvider extends BaseProvider {
    readonly id = 'vidzee';
    readonly name = 'VidZee';
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
            const data = await vidzee.fetchSources(media.tmdbId, media.type, media.s, media.e);
            const headers = data.headers || {};
            const sources: Source[] = [];

            for (const src of data.sources) {
                const uLower = (src.url || '').toLowerCase();
                const sLower = (src.server || '').toLowerCase();
                if (uLower.includes('boomchick') || sLower.includes('tcloud') || uLower.includes('streamflix')) {
                    continue;
                }
                const url = (headers && Object.keys(headers).length > 0) ? this.createProxyUrl(src.url, headers) : src.url;
                sources.push({
                    url,
                    quality: src.quality || 'auto',
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
        } catch (e) {}

        // Fallback upstream mirror via vidnest
        try {
            const data = await vidnest.fetchSources(media.tmdbId, media.type, media.s, media.e);
            if (data?.sources?.length) {
                const sources: Source[] = data.sources.map(src => {
                    const ext = src.isM3U8 || src.url.includes('.m3u8') ? '.m3u8' : '.mp4';
                    return {
                        url: src.url + (src.url.includes('?') ? '&' : '?') + 'provider=' + this.id + '&ext=' + ext,
                        quality: src.quality || 'auto',
                        type: src.isM3U8 || src.url.includes('.m3u8') ? 'hls' : 'mp4',
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: `${this.name} (Mirror)`,
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
