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
    resolveRiveStreamClean
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
        const sources: Source[] = [];

        // 1. Native LMScript for movies
        if (media.type === 'movie') {
            try {
                const data: any = await Promise.race([
                    lmscript.fetchSources(media.tmdbId, 'movie', season, episode),
                    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 3500))
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
                    if (sources.length > 0) {
                        return { sources, subtitles: [], diagnostics: [] };
                    }
                }
            } catch {}
        }

        // 2. VidNest v2 for TV episodes and movie fallback
        const v2 = await resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'Script HD', path: 'flixhq' },
                { name: 'Script Cloud', path: 'nextgencloudfabric' }
            ],
            3200
        );
        if (v2.sources.length > 0) {
            return { sources: v2.sources, subtitles: v2.subtitles, diagnostics: [] };
        }

        // 3. Clean RiveStream fallback
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
