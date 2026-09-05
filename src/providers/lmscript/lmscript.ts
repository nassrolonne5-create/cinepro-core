import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult, Source } from '@omss/framework';
import { fetchSources } from 'kaizoku-core/providers/movies/lmscript';

export class LmscriptProvider extends BaseProvider {
    readonly id = 'lmscript';
    readonly name = 'LMScript';
    readonly enabled = true;
    readonly BASE_URL = 'https://lmscript.xyz';
    readonly HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
    
    // LMScript only supports movies currently
    readonly capabilities: ProviderCapabilities = { supportedContentTypes: ['movies'] };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> { return this.fetchSources(media); }
    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> { return { sources: [], subtitles: [], diagnostics: [] }; }
    
    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        if (media.type === 'tv') return { sources: [], subtitles: [], diagnostics: [] };
        try {
            const data = await fetchSources(media.tmdbId, media.type);
            const headers = data.headers || this.HEADERS;
            const sources: Source[] = [];
            for (const src of data.sources) {
                sources.push({
                    url: this.createProxyUrl(src.url, headers),
                    quality: src.quality || 'auto',
                    type: getSourceType(src.url, src.isM3U8),
                    audioTracks: [],
                    provider: {
                        name: this.name,
                        id: this.id
                    }
                });
            }
            return { sources, subtitles: [], diagnostics: [] };
        } catch (e) { return { sources: [], subtitles: [], diagnostics: [] }; }
    }
    async healthCheck(): Promise<boolean> { return true; }
}
