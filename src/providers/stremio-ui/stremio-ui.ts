import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { purstream } from 'kaizoku-core';
import { getSourceType } from '../../utils/streamType.js';
import {
    getMediaSeasonEpisode,
    resolveVidnestV2,
    resolveRiveStreamClean
} from '../../utils/vidnestV2.js';

export class StremioUIProvider extends BaseProvider {
    readonly id = 'stremio';
    readonly name = 'Stremio';
    readonly enabled = true;
    readonly BASE_URL = 'https://v3-cinemeta.strem.io';
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
        const sources: Source[] = [];

        const [v2Settled, purSettled] = await Promise.allSettled([
            resolveVidnestV2(
                media,
                this.id,
                this.name,
                (u, h) => this.createProxyUrl(u, h),
                [
                    { name: 'WebStreamr HD', path: 'flixhq' },
                    { name: 'Nuvio Cloud', path: 'nextgencloudfabric' }
                ],
                3200
            ),
            Promise.race([
                purstream.fetchSources(media.tmdbId, media.type, season, episode),
                new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
            ])
        ]);

        if (v2Settled.status === 'fulfilled' && v2Settled.value.sources.length > 0) {
            sources.push(...v2Settled.value.sources);
        }

        if (purSettled.status === 'fulfilled' && Array.isArray((purSettled.value as any)?.sources)) {
            for (const src of (purSettled.value as any).sources) {
                if (!src?.url) continue;
                sources.push({
                    url: src.url,
                    quality: src.quality || '1080p',
                    type: getSourceType(src.url, src.isM3U8),
                    server: 'Direct HTTP',
                    audioTracks: [{ language: 'en', label: 'English' }],
                    provider: {
                        name: `${this.name} (Direct HTTP)`,
                        id: `${this.id}-directhttp`
                    }
                });
            }
        }

        if (sources.length > 0) {
            const subtitles = v2Settled.status === 'fulfilled' ? v2Settled.value.subtitles : [];
            return { sources, subtitles, diagnostics: [] };
        }

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
