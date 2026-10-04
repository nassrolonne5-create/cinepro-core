import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidnest } from 'kaizoku-core';

export class CinesuProvider extends BaseProvider {
    readonly id = 'cinesu';
    readonly name = 'CineSu';
    readonly enabled = true;
    readonly BASE_URL = 'https://cinesu.net';
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
            const data = await vidnest.fetchSources(media.tmdbId, media.type, media.s, media.e);
            const sources: Source[] = [];

            if (data && Array.isArray(data.sources)) {
                for (const src of data.sources) {
                    const ext = src.isM3U8 || src.url.includes('.m3u8') ? '.m3u8' : '.mp4';
                    sources.push({
                        url: src.url + (src.url.includes('?') ? '&' : '?') + 'provider=' + this.id + '&ext=' + ext,
                        quality: src.quality || 'auto',
                        type: getSourceType(src.url, src.isM3U8),
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: this.name,
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
