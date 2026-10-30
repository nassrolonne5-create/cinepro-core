import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidgod, trendimovies } from 'kaizoku-core';
import {
    getMediaSeasonEpisode,
    isCleanEnglishStream,
    resolveVidnestV2,
    resolveRiveStreamClean,
    mergeProviderSources
} from '../../utils/vidnestV2.js';

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
        const timeout = (ms: number) => new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));

        const nativeTask = (async () => {
            const sources: Source[] = [];
            try {
                const data: any = await Promise.race([
                    vidgod.fetchSources(media.tmdbId, media.type, season, episode),
                    timeout(2600)
                ]);
                if (data && Array.isArray(data.sources)) {
                    for (const src of data.sources) {
                        if (!isCleanEnglishStream(src.url, src.server, src.quality)) continue;
                        const sName = src.server || 'Pulsar';
                        sources.push({
                            url: src.url,
                            quality: src.quality || '1080p',
                            type: getSourceType(src.url, src.isM3U8),
                            server: sName,
                            audioTracks: [{ language: 'en', label: 'English' }],
                            provider: {
                                name: `${this.name} (${sName})`,
                                id: `${this.id}-${sName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                            }
                        });
                    }
                }
            } catch {}
            return sources;
        })();

        const trendiTask = (async () => {
            try {
                const downloads: any = await Promise.race([
                    (trendimovies as any).getDownloads(media.tmdbId, media.type, season, episode),
                    timeout(2500)
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
                        })) as Source[];
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
                { name: 'Pulsar 4K', path: 'flixhq' },
                { name: 'Orion Cloud', path: 'nextgencloudfabric' }
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

        const [nativeSources, trendiSources, v2, riveSources] = await Promise.all([
            nativeTask,
            trendiTask,
            v2Task,
            riveTask
        ]);

        const merged = mergeProviderSources(nativeSources, trendiSources, v2.sources, riveSources);
        return { sources: merged, subtitles: v2.subtitles, diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
