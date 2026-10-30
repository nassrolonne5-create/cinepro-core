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
    resolveRiveStreamClean,
    mergeProviderSources
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

        const directTask = (async () => {
            const sources: Source[] = [];
            try {
                const links: any = await Promise.race([
                    (trendimovies as any).getDownloads(media.tmdbId, media.type, season, episode),
                    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 2800))
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
            return sources;
        })();

        const v2Task = resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'Direct HD', path: 'flixhq' },
                { name: 'Cloud HD', path: 'nextgencloudfabric' }
            ],
            2800
        ).catch(() => ({ sources: [] as Source[], subtitles: [] }));

        const riveTask = resolveRiveStreamClean(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            2800
        ).catch(() => [] as Source[]);

        const [directSources, v2, riveSources] = await Promise.all([directTask, v2Task, riveTask]);
        const merged = mergeProviderSources(directSources, v2.sources, riveSources);

        return { sources: merged, subtitles: v2.subtitles, diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
