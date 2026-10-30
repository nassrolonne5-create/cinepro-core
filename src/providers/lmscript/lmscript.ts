import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { lmscript } from 'kaizoku-core';
import {
    getMediaSeasonEpisode,
    resolveVidnestV2,
    resolveRiveStreamClean,
    mergeProviderSources
} from '../../utils/vidnestV2.js';

export class LmscriptProvider extends BaseProvider {
    readonly id = 'lmscript';
    readonly name = 'LMScript';
    readonly enabled = true;
    readonly BASE_URL = 'https://lmscript.xyz';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
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

        const nativeTask = (async () => {
            const sources: Source[] = [];
            if (media.type === 'movie') {
                try {
                    const data: any = await Promise.race([
                        lmscript.fetchSources(media.tmdbId, 'movie', season, episode),
                        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
                    ]);
                    if (Array.isArray(data?.sources) && data.sources.length > 0) {
                        const headers = data.headers || {};
                        let idx = 0;
                        for (const src of data.sources) {
                            if (!src?.url) continue;
                            idx++;
                            const proxiedUrl = Object.keys(headers).length > 0
                                ? this.createProxyUrl(src.url, headers)
                                : src.url;
                            const sLabel = src.server || `Server ${idx}`;
                            sources.push({
                                url: proxiedUrl,
                                quality: src.quality || '1080p',
                                type: getSourceType(src.url, src.isM3U8),
                                server: sLabel,
                                audioTracks: [{ language: 'en', label: 'English' }],
                                provider: {
                                    name: `${this.name} (${sLabel})`,
                                    id: `${this.id}-${idx}`
                                }
                            });
                        }
                    }
                } catch {}
            }
            return sources;
        })();

        const v2Task = resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'Script HD', path: 'flixhq' },
                { name: 'Script Cloud', path: 'nextgencloudfabric' }
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

        const [nativeSources, v2, riveSources] = await Promise.all([nativeTask, v2Task, riveTask]);
        const merged = mergeProviderSources(nativeSources, v2.sources, riveSources);

        return { sources: merged, subtitles: v2.subtitles, diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
