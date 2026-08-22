import { BaseProvider } from '@omss/framework';
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult, Source } from '@omss/framework';
import { fetchSources } from 'kaizoku-core/providers/movies/vidcore';

export class VidcoreProvider extends BaseProvider {
    readonly id = 'vidcore';
    readonly name = 'Vidcore';
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
            console.error(`[${this.name}] Error:`, e);
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
