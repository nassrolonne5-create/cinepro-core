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

export class VixsrcProvider extends BaseProvider {
    readonly id = 'vixsrc';
    readonly name = 'VixSrc';
    readonly enabled = true;
    readonly BASE_URL = 'https://vixsrc.to';
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

        const directTask = (async () => {
            try {
                const downloads: any = await Promise.race([
                    (trendimovies as any).getDownloads(media.tmdbId, media.type, season, episode),
                    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 2800))
                ]);
                if (Array.isArray(downloads) && downloads.length > 0) {
                    return downloads
                        .filter((l: any) => l?.url && l.active !== false)
                        .map((l: any) => {
                            const q = l.quality || 'HD';
                            const serverName = `Direct ${q}`;
                            return {
                                url: l.url,
                                quality: q,
                                type: l.url.includes('.m3u8') ? 'hls' : 'mp4',
                                server: serverName,
                                audioTracks: [{ language: 'en', label: 'English' }],
                                provider: {
                                    name: `${this.name} (${q})`,
                                    id: `${this.id}-${q.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                                }
                            } as Source;
                        });
                }
            } catch {}
            return [] as Source[];
        })();

        const v2Task = resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'Vix 4K', path: 'flixhq' },
                { name: 'Vix Cloud', path: 'nextgencloudfabric' }
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
