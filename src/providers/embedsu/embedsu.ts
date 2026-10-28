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

export class EmbedSuProvider extends BaseProvider {
    readonly id = 'embedsu';
    readonly name = 'EmbedSU';
    readonly enabled = true;
    readonly BASE_URL = 'https://embed.su';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
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

        // 1. VidNest v2 (Viper HD & Astra Cloud)
        const v2 = await resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'Viper HD', path: 'flixhq' },
                { name: 'Astra Cloud', path: 'nextgencloudfabric' }
            ],
            3200
        );
        if (v2.sources.length > 0) {
            return { sources: v2.sources, subtitles: v2.subtitles, diagnostics: [] };
        }

        // 2. Clean RiveStream mirror
        const riveSources = await resolveRiveStreamClean(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            3200
        );
        if (riveSources.length > 0) {
            return { sources: riveSources, subtitles: [], diagnostics: [] };
        }

        // 3. Direct TrendiMovies mirror
        try {
            const downloads: any = await Promise.race([
                (trendimovies as any).getDownloads(media.tmdbId, media.type, season, episode),
                new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500))
            ]);
            if (Array.isArray(downloads) && downloads.length > 0) {
                const sources: Source[] = downloads
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
                    }));
                if (sources.length > 0) return { sources, subtitles: [], diagnostics: [] };
            }
        } catch {}

        return { sources: [], subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
