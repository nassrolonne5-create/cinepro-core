import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { trendimovies } from 'kaizoku-core';

export class TrendimoviesProvider extends BaseProvider {
    readonly id = 'trendimovies';
    readonly name = 'TrendiMovies';
    readonly enabled = false;
    readonly BASE_URL = 'https://trendimovies.com';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
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
            const downloads = await (trendimovies as any).getDownloads(
                media.tmdbId,
                media.type,
                media.s,
                media.e
            );

            if (!downloads || !Array.isArray(downloads) || downloads.length === 0) {
                return { sources: [], subtitles: [], diagnostics: [] };
            }

            const sources: Source[] = [];
            for (const item of downloads) {
                if (!item?.url || item.active === false) continue;
                const isM3U8 = item.url.includes('.m3u8');
                sources.push({
                    url: item.url,
                    quality: item.quality || 'HD',
                    type: isM3U8 ? 'hls' : 'mp4',
                    audioTracks: [{ language: 'en', label: 'English' }],
                    provider: {
                        name: this.name,
                        id: this.id
                    }
                });
            }

            return { sources, subtitles: [], diagnostics: [] };
        } catch {
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
