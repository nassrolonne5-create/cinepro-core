import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { fetchSources } from 'kaizoku-core/providers/movies/vixsrc';

export class VixsrcProvider extends BaseProvider {
    readonly id = 'vixsrc';
    readonly name = 'VixSrc';
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
                sources.push({
                    url: getSourceType(src.url, src.isM3U8) === 'mp4' ? src.url : this.createProxyUrl(src.url, headers),
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
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
