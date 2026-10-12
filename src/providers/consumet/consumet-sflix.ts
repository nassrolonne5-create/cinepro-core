import { BaseProvider } from '@omss/framework';
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult, Source } from '@omss/framework';
import { rivestream, trendimovies } from 'kaizoku-core';
import { getSourceType } from '../../utils/streamType.js';

export class ConsumetSFlixProvider extends BaseProvider {
    readonly id = 'consumet-sflix';
    readonly name = 'SFlixLine';
    readonly enabled = true;
    readonly BASE_URL = 'https://sflixline.com';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Referer': 'https://sflixline.com/'
    };
    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['tv', 'movies']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.extractSources(media),
            new Promise<ProviderResult>((resolve) => setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6500))
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.extractSources(media),
            new Promise<ProviderResult>((resolve) => setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6500))
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    private async extractSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const sources: Source[] = [];
        const callWithTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T | null> => {
            try {
                const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
                return await Promise.race([promise, timeout]);
            } catch {
                return null;
            }
        };

        // 1. RiveStream UpCloud & Vidcloud mirrors
        try {
            const data: any = await callWithTimeout(
                rivestream.fetchSources(media.tmdbId, media.type, media.s, media.e),
                3500
            );
            if (data?.sources?.length) {
                for (const src of data.sources) {
                    const uLower = (src.url || '').toLowerCase();
                    if (uLower.includes('boomchick') || uLower.includes('streamflix') || uLower.includes('aoneroom') || uLower.includes('tiktoks')) continue;
                    const serverName = src.server ? `SFlixLine (${src.server})` : 'SFlixLine (UpCloud)';
                    sources.push({
                        url: src.url,
                        quality: src.quality || '1080p',
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

        // 2. TrendiMovies direct SFlixLine downloads/streams
        try {
            const downloads: any = await callWithTimeout(
                (trendimovies as any).getDownloads(media.tmdbId, media.type, media.s, media.e),
                3000
            );
            if (downloads && Array.isArray(downloads) && downloads.length > 0) {
                for (const item of downloads) {
                    if (!item?.url || item.active === false) continue;
                    const q = item.quality || 'HD';
                    const serverName = `SFlixLine (${q})`;
                    sources.push({
                        url: item.url,
                        quality: q,
                        type: item.url.includes('.m3u8') ? 'hls' : 'mp4',
                        server: serverName,
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: serverName,
                            id: `${this.id}-${q.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                        }
                    });
                }
            }
        } catch {}

        return { sources, subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
