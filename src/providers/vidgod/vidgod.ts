import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidgod } from 'kaizoku-core';

export class VidgodProvider extends BaseProvider {
    readonly id = 'vidgod';
    readonly name = 'VidGod';
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
            const data = await vidgod.fetchSources(media.tmdbId, media.type, media.s, media.e);
            const sources: Source[] = [];

            if (data && Array.isArray(data.sources)) {
                for (const src of data.sources) {
                    sources.push({
                        url: src.url,
                        quality: src.quality || 'auto',
                        type: getSourceType(src.url, src.isM3U8),
                        audioTracks: [],
                        provider: {
                            name: src.server ? `${this.name} (${src.server})` : this.name,
                            id: this.id
                        }
                    });
                }
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
