import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidzee, vidnest, rivestream, trendimovies } from 'kaizoku-core';
import { unwrapAndBuildProxyUrl } from '../rivestream/rivestream.js';

export class VidzeeProvider extends BaseProvider {
    readonly id = 'vidzee';
    readonly name = 'VidZee';
    readonly enabled = true;
    readonly BASE_URL = '';
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
        (media as any).s = Number((media as any).season || (media as any).s || 1);
        (media as any).e = Number((media as any).episode || (media as any).e || 1);
        const timeout = (ms: number) => new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));

        try {
            const data: any = await Promise.race([
                vidzee.fetchSources(media.tmdbId, media.type, media.s, media.e),
                timeout(3000)
            ]);
            const headers = data?.headers || {};
            const sources: Source[] = [];

            for (const src of (data?.sources || [])) {
                const uLower = (src.url || '').toLowerCase();
                const sLower = (src.server || '').toLowerCase();
                if (uLower.includes('boomchick') || sLower.includes('tcloud') || uLower.includes('streamflix')) {
                    continue;
                }
                const url = unwrapAndBuildProxyUrl(
                    src.url,
                    src.headers || headers,
                    (u, h) => this.createProxyUrl(u, h)
                );
                const sName = src.server || 'Server 1';
                sources.push({
                    url,
                    quality: src.quality || 'auto',
                    type: src.isM3U8 || src.url.includes('.m3u8') ? 'hls' : 'mp4',
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
        } catch (e) {}

        // Fallback: Cached Clean RiveStream & VidNest v2
        try {
            const { resolveRiveStreamClean, resolveVidnestV2 } = await import('../../utils/vidnestV2.js');
            const riveSources = await resolveRiveStreamClean(
                media,
                this.id,
                this.name,
                (u, h) => this.createProxyUrl(u, h),
                2800
            );
            if (riveSources.length > 0) {
                return { sources: riveSources, subtitles: [], diagnostics: [] };
            }

            const v2 = await resolveVidnestV2(
                media,
                this.id,
                this.name,
                (u, h) => this.createProxyUrl(u, h),
                [
                    { name: 'Ultra 4K', path: 'flixhq' },
                    { name: 'Zee Cloud', path: 'nextgencloudfabric' }
                ],
                2800
            );
            if (v2.sources.length > 0) {
                return { sources: v2.sources, subtitles: v2.subtitles, diagnostics: [] };
            }
        } catch {}

        // Fallback: TrendiMovies
        try {
            const downloads: any = await Promise.race([
                (trendimovies as any).getDownloads(media.tmdbId, media.type, (media as any).s, (media as any).e),
                timeout(2200)
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
}
