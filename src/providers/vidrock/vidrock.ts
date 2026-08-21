import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { fetchSources } from 'kaizoku-core/providers/movies/vidrock';

export class VidRockProvider extends BaseProvider {
    readonly id = 'vidrock';
    readonly name = 'vidrock.ru';
    readonly enabled = true;
    readonly BASE_URL = 'https://vidrock.ru';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
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
        try {
            const data = await fetchSources(media.tmdbId, media.type, media.s, media.e);
            const headers = data.headers || this.HEADERS;
            const sources: Source[] = [];
            
            for (const src of data.sources) {
                sources.push({
                    url: this.createProxyUrl(src.url, headers),
                    quality: src.quality || 'auto',
                    type: src.isM3U8 || src.url.includes('.m3u8') ? 'hls' : 'mp4',
                    audioTracks: [],
                    provider: {
                        name: this.name,
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
