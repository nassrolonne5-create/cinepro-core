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

export class ConsumetSFlixProvider extends BaseProvider {
    readonly id = 'consumet-sflix';
    readonly name = 'SFlixLine';
    readonly enabled = true;
    readonly BASE_URL = 'https://sflixline.com';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Referer': 'https://sflixline.com/'
    };
    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['tv', 'movies']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.extractSources(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6500)
            )
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.extractSources(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6500)
            )
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    private async extractSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const { season, episode } = getMediaSeasonEpisode(media);

        const [riveSettled, v2Settled, trendiSettled] = await Promise.allSettled([
            resolveRiveStreamClean(
                media,
                this.id,
                this.name,
                (u, h) => this.createProxyUrl(u, h),
                3200
            ),
            resolveVidnestV2(
                media,
                this.id,
                this.name,
                (u, h) => this.createProxyUrl(u, h),
                [
                    { name: 'UpCloud', path: 'flixhq' },
                    { name: 'VidCloud', path: 'nextgencloudfabric' }
                ],
                3200
            ),
            (async () => {
                try {
                    const downloads: any = await Promise.race([
                        (trendimovies as any).getDownloads(media.tmdbId, media.type, season, episode),
                        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 2600))
                    ]);
                    if (Array.isArray(downloads) && downloads.length > 0) {
                        return downloads
                            .filter((item: any) => item?.url && item.active !== false)
                            .map((item: any) => {
                                const q = item.quality || 'HD';
                                const serverName = `${this.name} (${q})`;
                                return {
                                    url: item.url,
                                    quality: q,
                                    type: item.url.includes('.m3u8') ? 'hls' : 'mp4',
                                    server: serverName,
                                    audioTracks: [{ language: 'en', label: 'English' }],
                                    provider: {
                                        name: serverName,
                                        id: `${this.id}-${q.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                                    }
                                } as Source;
                            });
                    }
                } catch {}
                return [] as Source[];
            })()
        ]);

        const riveSources = riveSettled.status === 'fulfilled' ? riveSettled.value : [];
        const v2Sources = v2Settled.status === 'fulfilled' ? v2Settled.value.sources : [];
        const v2Subs = v2Settled.status === 'fulfilled' ? v2Settled.value.subtitles : [];
        const trendiSources = trendiSettled.status === 'fulfilled' ? trendiSettled.value : [];

        return {
            sources: mergeProviderSources(trendiSources, v2Sources, riveSources),
            subtitles: v2Subs,
            diagnostics: []
        };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
