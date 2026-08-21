import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult
} from '@omss/framework';

export class EmbedSuProvider extends BaseProvider {
    readonly id = 'embedsu';
    readonly name = 'EmbedSU';
    readonly enabled = true;
    readonly BASE_URL = 'https://vidsrc.in';
    readonly HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8' };
    
    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return {
            sources: [
                {
                    url: this.createProxyUrl(`https://vidsrc.in/embed/movie/${media.tmdbId}`, this.HEADERS),
                    quality: 'auto',
                    type: 'embed',
                    audioTracks: [],
                    provider: {
                        name: this.name,
                        id: this.id
                    }
                }
            ],
            subtitles: [],
            diagnostics: []
        };
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        if (!media.s || !media.e) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }
        return {
            sources: [
                {
                    url: this.createProxyUrl(`https://vidsrc.in/embed/tv/${media.tmdbId}/${media.s}/${media.e}`, this.HEADERS),
                    quality: 'auto',
                    type: 'embed',
                    audioTracks: [],
                    provider: {
                        name: this.name,
                        id: this.id
                    }
                }
            ],
            subtitles: [],
            diagnostics: []
        };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
