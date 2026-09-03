import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { fetchSources } from 'kaizoku-core/providers/movies/vidup';

export class VidupProvider extends BaseProvider {
    readonly id = 'vidup';
    readonly name = 'Vidup';
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
            const data = await fetchSources(media.tmdbId, media.type, media.s, media.e);
            const headers = data.headers || {};
            const sources: Source[] = [];

            for (const src of data.sources) {
                let quality = src.quality || 'Auto';
                if (quality === 'default' || quality === 'auto') {
                    if (src.url.includes('2160')) quality = '4K';
                    else if (src.url.includes('1080')) quality = '1080p';
                    else if (src.url.includes('720')) quality = '720p';
                    else if (src.url.includes('480')) quality = '480p';
                    else quality = 'Auto';
                }
                sources.push({
                    url: this.createProxyUrl(src.url, headers),
                    quality,
                    type: getSourceType(src.url, src.isM3U8),
                    audioTracks: [],
                    provider: {
                        name: data.sources.length > 1 ? `${this.name} ${data.sources.indexOf(src) + 1}` : this.name,
                        id: this.id
                    }
                });
            }
            return { sources, subtitles: [], diagnostics: [] };
        } catch (e) {
            console.error('[VidupProvider/Cargo] Error fetching sources:', (e as any)?.message || e);
            return {
                sources: [],
                subtitles: [],
                diagnostics: [
                    {
                        code: 'PROVIDER_ERROR',
                        message: `Cargo (Vidup): ${(e as any)?.message || String(e)}`,
                        field: '',
                        severity: 'error'
                    }
                ]
            };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
