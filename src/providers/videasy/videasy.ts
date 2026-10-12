import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { rivestream, trendimovies } from 'kaizoku-core';
import { getSourceType } from '../../utils/streamType.js';

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
            new Promise<ProviderResult>((resolve) => setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6500))
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) => setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6500))
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const timeout = (ms: number) => new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));

        // 1. Try RiveStream
        try {
            const data: any = await Promise.race([
                rivestream.fetchSources(media.tmdbId, media.type, media.s, media.e),
                timeout(3500)
            ]);
            if (data?.sources?.length) {
                const sources: Source[] = [];
                for (const src of data.sources) {
                    const uLower = (src.url || '').toLowerCase();
                    const qLower = (src.quality || '').toLowerCase();
                    const sLower = (src.server || '').toLowerCase();

                    // Only filter true dead or foreign dubs
                    if (
                        uLower.includes('boomchick') || uLower.includes('streamflix') ||
                        uLower.includes('tiktoks') || uLower.includes('animanga') || uLower.includes('aoneroom') ||
                        qLower.includes('hindi') || qLower.includes('tamil') || qLower.includes('telugu') ||
                        sLower.includes('hindi') || sLower.includes('tamil')
                    ) {
                        continue;
                    }

                    const streamUrl = (data.headers && Object.keys(data.headers).length > 0)
                        ? this.createProxyUrl(src.url, data.headers)
                        : src.url;

                    const sName = src.server || 'Server 1';
                    sources.push({
                        url: streamUrl,
                        quality: src.quality || 'Auto',
                        type: getSourceType(src.url, src.isM3U8),
                        server: sName,
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: `${this.name} (${sName})`,
                            id: `${this.id}-${sName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                        }
                    });
                }
                if (sources.length > 0) {
                    return { sources, subtitles: [], diagnostics: [] };
                }
            }
        } catch {}

        // 2. Direct TrendiMovies mirror
        try {
            const downloads: any = await Promise.race([
                (trendimovies as any).getDownloads(media.tmdbId, media.type, media.s, media.e),
                timeout(2500)
            ]);
            if (downloads && Array.isArray(downloads) && downloads.length > 0) {
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
