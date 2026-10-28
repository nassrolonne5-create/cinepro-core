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

export class ConsumetDramaCoolProvider extends BaseProvider {
    readonly id = 'consumet-dramacool';
    readonly name = 'DramaCool';
    readonly enabled = true;
    readonly BASE_URL = 'https://dramacool.bg';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Referer': 'https://dramacool.bg/'
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
        const sources: Source[] = [];

        const [v2Settled, purSettled] = await Promise.allSettled([
            resolveVidnestV2(
                media,
                this.id,
                this.name,
                (u, h) => this.createProxyUrl(u, h),
                [
                    { name: 'AsianCloud', path: 'flixhq' },
                    { name: 'StreamSB', path: 'nextgencloudfabric' }
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
                    server: 'Direct HD',
                    audioTracks: [{ language: 'en', label: 'English' }],
                    provider: {
                        name: `${this.name} (Direct HD)`,
                        id: `${this.id}-directhd`
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
