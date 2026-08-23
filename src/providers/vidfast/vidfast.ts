import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { fetchSources } from 'kaizoku-core/providers/movies/vidfast';

export class VidfastProvider extends BaseProvider {
    readonly id = 'vidfast';
    readonly name = 'Photon';
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
                    url: this.createProxyUrl(src.url, headers),
                    quality: src.quality || 'auto',
                    type: src.isM3U8 || src.url.includes('.m3u8') ? 'hls' : 'mp4',
                    audioTracks: [],
                    provider: {
                        name: src.server ? `Photon (${src.server})` : this.name,
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
