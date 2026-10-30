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

export class VideasyProvider extends BaseProvider {
    readonly id = 'videasy';
    readonly name = 'Videasy';
    readonly enabled = true;
    readonly BASE_URL = 'https://player.videasy.to';
    readonly HEADERS = {};

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
                    { name: 'Neon HD', path: 'flixhq' },
                    { name: 'Cypher Cloud', path: 'nextgencloudfabric' }
                ],
                3200
            ),
            (async () => {
                try {
                    const downloads: any = await Promise.race([
                        (trendimovies as any).getDownloads(media.tmdbId, media.type, season, episode),
                        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500))
                    ]);
                    if (Array.isArray(downloads) && downloads.length > 0) {
                        return downloads
                            .filter((l: any) => l?.url && l.active !== false)
                            .map((l: any) => ({
                                url: l.url,
                                quality: l.quality || 'HD',
                                type: l.url.includes('.m3u8') ? 'hls' : 'mp4',
                                server: `Direct ${l.quality || 'HD'}`,
                                audioTracks: [{ language: 'en', label: 'English' }],
                                provider: {
                                    name: `${this.name} (${l.quality || 'Direct'})`,
                                    id: `${this.id}-${(l.quality || 'direct').toLowerCase().replace(/[^a-z0-9]/g, '')}`
                                }
                            } as Source));
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
