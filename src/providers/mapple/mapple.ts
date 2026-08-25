import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult, Source } from '@omss/framework';
import { fetchSources } from 'kaizoku-core/providers/movies/mapple';

export class MappleProvider extends BaseProvider {
    readonly id = 'mapple';
    readonly name = 'Mapple';
    readonly enabled = true;
    readonly BASE_URL = 'https://example.com';
    readonly HEADERS = {};
    
    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.extractSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.extractSources(media);
    }

    private async extractSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            const data = await fetchSources(media.tmdbId, media.type, media.s, media.e);
            const headers = data.headers || {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            };

            const sources: Source[] = [];
            for (const src of data.sources) {
                sources.push({
                    url: this.createProxyUrl(src.url, headers),
                    quality: src.quality || 'auto',
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
            console.error(`[${this.name}] Error:`, e);
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
