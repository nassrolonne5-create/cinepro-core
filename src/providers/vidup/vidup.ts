import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidup, vidnest, rivestream } from 'kaizoku-core';

export class VidupProvider extends BaseProvider {
    readonly id = 'vidup';
    readonly name = 'VidUp';
    readonly enabled = true;
    readonly BASE_URL = 'https://vidup.to';
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
        // 1. Try native vidup (with strict 3000ms timeout)
        try {
            const data: any = await this.callWithTimeout(
                vidup.fetchSources(media.tmdbId, media.type, media.s, media.e),
                3000
            );
            if (data?.sources?.length) {
                const sources: Source[] = data.sources.map((src: any) => ({
                    url: src.url,
                    quality: src.quality || 'auto',
                    type: getSourceType(src.url, src.isM3U8),
                    audioTracks: [{ language: 'en', label: 'English' }],
                    provider: {
                        name: this.name,
                        id: this.id
                    }
                }));
                return { sources, subtitles: [], diagnostics: [] };
            }
        } catch {}

        // 2. High-speed RiveStream source
        try {
            const data: any = await this.callWithTimeout(
                rivestream.fetchSources(media.tmdbId, media.type, media.s, media.e),
                3000
            );
            if (data?.sources?.length) {
                const sources: Source[] = [];
                for (const src of data.sources) {
                    const uLower = (src.url || '').toLowerCase();
                    if (uLower.includes('boomchick') || uLower.includes('aoneroom') || uLower.includes('tiktoks')) continue;
                    sources.push({
                        url: src.url,
                        quality: src.quality || 'auto',
                        type: getSourceType(src.url, src.isM3U8),
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: src.server ? `${this.name} (${src.server})` : this.name,
                            id: this.id
                        }
                    });
                }
                if (sources.length > 0) {
                    return { sources, subtitles: [], diagnostics: [] };
                }
            }
        } catch {}

        // 3. Vidnest Fallback
        try {
            const data: any = await this.callWithTimeout(
                vidnest.fetchSources(media.tmdbId, media.type, media.s, media.e),
                2500
            );
            if (data?.sources?.length) {
                const sources: Source[] = data.sources.map((src: any) => {
                    const ext = src.isM3U8 || src.url.includes('.m3u8') ? '.m3u8' : '.mp4';
                    return {
                        url: src.url + (src.url.includes('?') ? '&' : '?') + 'provider=' + this.id + '&ext=' + ext,
                        quality: src.quality || 'auto',
                        type: getSourceType(src.url, src.isM3U8),
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: this.name,
                            id: this.id
                        }
                    };
                });
                return { sources, subtitles: [], diagnostics: [] };
            }
        } catch {}

        return { sources: [], subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
