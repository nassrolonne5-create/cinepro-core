import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidnest, vidup, rivestream, trendimovies } from 'kaizoku-core';

export class CinesuProvider extends BaseProvider {
    readonly id = 'cinesu';
    readonly name = 'CineSu';
    readonly enabled = true;
    readonly BASE_URL = 'https://cinesu.net';
    readonly HEADERS = {};
    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 8000)
            )
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 8000)
            )
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    private async callWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
        try {
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), ms)
            );
            return await Promise.race([promise, timeout]);
        } catch {
            return null;
        }
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        // 1. High-speed RiveStream source
        try {
            const data: any = await this.callWithTimeout(
                rivestream.fetchSources(media.tmdbId, media.type, media.s, media.e),
                3500
            );
            if (data?.sources?.length) {
                const sources: Source[] = [];
                for (const src of data.sources) {
                    const uLower = (src.url || '').toLowerCase();
                    if (uLower.includes('boomchick') || uLower.includes('aoneroom') || uLower.includes('tiktoks')) continue;
                    const serverName = src.server ? `${this.name} (${src.server})` : `${this.name} (Prime)`;
                    sources.push({
                        url: src.url,
                        quality: src.quality || 'auto',
                        type: getSourceType(src.url, src.isM3U8),
                        server: serverName,
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: serverName,
                            id: `${this.id}-${serverName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                        }
                    });
                }
                if (sources.length > 0) {
                    return { sources, subtitles: [], diagnostics: [] };
                }
            }
        } catch {}

        // 2. Vidnest mirror
        try {
            const data: any = await this.callWithTimeout(
                vidnest.fetchSources(media.tmdbId, media.type, media.s, media.e),
                3500
            );
            if (data?.sources?.length) {
                const sources: Source[] = [];
                for (const src of data.sources) {
                    const ext = src.isM3U8 || src.url.includes('.m3u8') ? '.m3u8' : '.mp4';
                    const serverName = `${this.name} (Mirror)`;
                    sources.push({
                        url: src.url + (src.url.includes('?') ? '&' : '?') + 'provider=' + this.id + '&ext=' + ext,
                        quality: src.quality || 'auto',
                        type: getSourceType(src.url, src.isM3U8),
                        server: serverName,
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: serverName,
                            id: `${this.id}-mirror`
                        }
                    });
                }
                if (sources.length > 0) {
                    return { sources, subtitles: [], diagnostics: [] };
                }
            }
        } catch {}

        // 3. Trendimovies direct downloads
        try {
            const downloads: any = await this.callWithTimeout(
                (trendimovies as any).getDownloads(media.tmdbId, media.type, media.s, media.e),
                3000
            );
            if (downloads && Array.isArray(downloads) && downloads.length > 0) {
                const sources: Source[] = downloads
                    .filter((l: any) => l?.url && l.active !== false)
                    .map((l: any) => {
                        const serverName = `${this.name} (Direct)`;
                        return {
                            url: l.url,
                            quality: l.quality || 'HD',
                            type: l.url.includes('.m3u8') ? 'hls' : 'mp4',
                            server: serverName,
                            audioTracks: [{ language: 'en', label: 'English' }],
                            provider: {
                                name: serverName,
                                id: `${this.id}-direct`
                            }
                        };
                    });
                if (sources.length > 0) {
                    return { sources, subtitles: [], diagnostics: [] };
                }
            }
        } catch {}

        // 4. Fallback upstream mirror via vidup (fast 2500ms timeout)
        try {
            const data: any = await this.callWithTimeout(
                vidup.fetchSources(media.tmdbId, media.type, media.s, media.e),
                2500
            );
            if (data?.sources?.length) {
                const sources: Source[] = data.sources.map((src: any) => ({
                    url: src.url,
                    quality: src.quality || 'auto',
                    type: getSourceType(src.url, src.isM3U8),
                    audioTracks: [{ language: 'en', label: 'English' }],
                    provider: {
                        name: `${this.name} (VidUp)`,
                        id: this.id
                    }
                }));
                if (sources.length > 0) {
                    return { sources, subtitles: [], diagnostics: [] };
                }
            }
        } catch {}

        return { sources: [], subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
