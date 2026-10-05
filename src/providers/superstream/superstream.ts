import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidgod, rivestream } from 'kaizoku-core';
import { getSourceType } from '../../utils/streamType.js';

export class SuperStreamProvider extends BaseProvider {
    readonly id = 'superstream';
    readonly name = 'SuperStream';
    readonly enabled = true;
    
    readonly BASE_URL = 'https://showbox.shegu.net/api/api_client/res/';
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
        // Try StreamFlix full-length HD stream
        try {
            const data = await vidgod.fetchSources(media.tmdbId, media.type, media.s, media.e);
            if (data?.sources?.length) {
                const sources: Source[] = [];
                for (const src of data.sources) {
                    const uLower = (src.url || '').toLowerCase();
                    if (uLower.includes('tiktoks') || uLower.includes('aoneroom') || uLower.includes('boomchick')) continue;
                    sources.push({
                        url: src.url,
                        quality: src.quality || 'Auto',
                        type: getSourceType(src.url, src.isM3U8),
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: this.name,
                            id: this.id
                        }
                    });
                }
                if (sources.length > 0) {
                    return { sources, subtitles: [], diagnostics: [] };
                }
            }
        } catch {}

        // Fallback to RiveStream full-length stream
        try {
            const data = await rivestream.fetchSources(media.tmdbId, media.type, media.s, media.e);
            if (data?.sources?.length) {
                const sources: Source[] = [];
                for (const src of data.sources) {
                    const uLower = (src.url || '').toLowerCase();
                    if (uLower.includes('tiktoks') || uLower.includes('aoneroom') || uLower.includes('boomchick')) continue;
                    sources.push({
                        url: src.url,
                        quality: src.quality || 'Auto',
                        type: getSourceType(src.url, src.isM3U8),
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: this.name,
                            id: this.id
                        }
                    });
                }
                if (sources.length > 0) {
                    return { sources, subtitles: [], diagnostics: [] };
                }
            }
        } catch {}

        return { sources: [], subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
