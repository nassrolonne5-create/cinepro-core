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
    readonly enabled = true;
    readonly BASE_URL = 'https://trendimovies.com';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) => setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6000))
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) => setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6000))
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 4500));
            const downloads: any = await Promise.race([
                (trendimovies as any).getDownloads(media.tmdbId, media.type, media.s, media.e),
                timeout
            ]);

            if (!downloads || !Array.isArray(downloads) || downloads.length === 0) {
                return { sources: [], subtitles: [], diagnostics: [] };
            }

            const sources: Source[] = [];
            for (const item of downloads) {
                if (!item?.url || item.active === false) continue;
                const isM3U8 = item.url.includes('.m3u8');
                const quality = item.quality || '1080p';
                sources.push({
                    url: item.url,
                    quality,
                    type: isM3U8 ? 'hls' : 'mp4',
                    server: `Direct ${quality}`,
                    audioTracks: [{ language: 'en', label: 'English' }],
                    provider: {
                        name: `${this.name} (${quality})`,
                        id: `${this.id}-${quality.toLowerCase().replace(/[^a-z0-9]/g, '')}`
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
