import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { trendimovies } from 'kaizoku-core';
import {
    getMediaSeasonEpisode,
    resolveVidnestV2,
    resolveRiveStreamClean
} from '../../utils/vidnestV2.js';

export class TrendiMoviesProvider extends BaseProvider {
    readonly id = 'trendimovies';
    readonly name = 'TrendiMovies';
    readonly enabled = true;
    readonly BASE_URL = 'https://trendimovies.com';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Referer': 'https://trendimovies.com/'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6500)
            )
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6500)
            )
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const { season, episode } = getMediaSeasonEpisode(media);
        const sources: Source[] = [];

        // 1. Direct MP4/HLS downloads from TrendiMovies
        try {
            const links: any = await Promise.race([
                (trendimovies as any).getDownloads(media.tmdbId, media.type, season, episode),
                new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 3200))
            ]);

            if (Array.isArray(links)) {
                for (const item of links) {
                    if (!item?.url || item.active === false) continue;
                    const quality = item.quality || '1080p';
                    const isM3U8 = item.url.includes('.m3u8');
                    const serverName = `Direct ${quality}`;
                    sources.push({
                        url: item.url,
                        quality,
                        type: isM3U8 ? 'hls' : 'mp4',
                        server: serverName,
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: `${this.name} (${quality})`,
                            id: `${this.id}-${quality.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                        }
                    });
                }
            }
        } catch {}

        if (sources.length > 0) {
            return { sources, subtitles: [], diagnostics: [] };
        }

        // 2. Fallback: VidNest v2 (Beta HD & Zeta Cloud) for TV episodes / missing movies
        const v2 = await resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'Direct HD', path: 'flixhq' },
                { name: 'Cloud HD', path: 'nextgencloudfabric' }
            ],
            3200
        );
        if (v2.sources.length > 0) {
            return { sources: v2.sources, subtitles: v2.subtitles, diagnostics: [] };
        }

        // 3. Fallback: Clean RiveStream
        const riveSources = await resolveRiveStreamClean(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            3000
        );
        return { sources: riveSources, subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
