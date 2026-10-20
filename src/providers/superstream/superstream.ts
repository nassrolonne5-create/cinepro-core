import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidgod, rivestream, vidnest } from 'kaizoku-core';
import { getSourceType } from '../../utils/streamType.js';
import { unwrapAndBuildProxyUrl } from '../rivestream/rivestream.js';

export class SuperStreamProvider extends BaseProvider {
    readonly id = 'superstream';
    readonly name = 'SuperStream';
    readonly enabled = true;
    
    readonly BASE_URL = 'https://showbox.shegu.net/api/api_client/res/';
    readonly HEADERS = {};

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const timeout = (ms: number) => new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
        const allSources: Source[] = [];

        // Run VidGod, RiveStream, and VidNest in parallel so SuperStream returns all healthy 4K & 1080p mirrors
        await Promise.allSettled([
            (async () => {
                try {
                    const data: any = await Promise.race([
                        vidgod.fetchSources(media.tmdbId, media.type, media.s, media.e),
                        timeout(3500)
                    ]);
                    if (data?.sources?.length) {
                        for (const src of data.sources) {
                            const uLower = (src.url || '').toLowerCase();
                            if (uLower.includes('streamflixserver.site') || uLower.includes('480ptvseries') || uLower.includes('goodstream.cc') || uLower.includes('tiktoks') || uLower.includes('aoneroom') || uLower.includes('boomchick')) continue;
                            const serverName = src.server ? `${this.name} (${src.server})` : `${this.name} (Direct)`;
                            allSources.push({
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
                    }
                } catch {}
            })(),
            (async () => {
                try {
                    const data: any = await Promise.race([
                        rivestream.fetchSources(media.tmdbId, media.type, media.s, media.e),
                        timeout(3500)
                    ]);
                    if (data?.sources?.length) {
                        const defaultHeaders = data.headers || {};
                        for (const src of data.sources) {
                            const uLower = (src.url || '').toLowerCase();
                            const sLower = (src.server || '').toLowerCase();
                            const qLower = (src.quality || '').toLowerCase();
                            if (
                                sLower.includes('vanguard') || sLower.includes('apogee') ||
                                uLower.includes('boomchick') || uLower.includes('streamflix') ||
                                uLower.includes('cheaptruckrepairs') || uLower.includes('rousav') ||
                                uLower.includes('klnwm') || uLower.includes('hlnom') || uLower.includes('tiktoks') || uLower.includes('aoneroom') ||
                                uLower.includes('onlinevisibilitysystem.site') || uLower.includes('highperformanceread.com') ||
                                qLower.includes('tamil') || qLower.includes('hindi') || qLower.includes('telugu')
                            ) continue;

                            const streamHeaders = src.headers || defaultHeaders;
                            const url = unwrapAndBuildProxyUrl(
                                src.url,
                                streamHeaders,
                                (u, h) => this.createProxyUrl(u, h)
                            );

                            const serverName = src.server ? `${this.name} (${src.server})` : `${this.name} (Mirage)`;
                            allSources.push({
                                url,
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
                    }
                } catch {}
            })()
        ]);

        if (allSources.length > 0) {
            return { sources: allSources, subtitles: [], diagnostics: [] };
        }

        // Fallback upstream mirror via vidnest
        try {
            const data: any = await Promise.race([
                vidnest.fetchSources(media.tmdbId, media.type, media.s, media.e),
                timeout(3500)
            ]);
            if (data?.sources?.length) {
                const sources: Source[] = data.sources.map((src: any) => {
                    const ext = src.isM3U8 || src.url.includes('.m3u8') ? '.m3u8' : '.mp4';
                    return {
                        url: src.url + (src.url.includes('?') ? '&' : '?') + 'provider=' + this.id + '&ext=' + ext,
                        quality: src.quality || 'auto',
                        type: getSourceType(src.url, src.isM3U8),
                        audioTracks: [{ language: 'en', label: 'English' }],
                        server: src.server ? `${this.name} (${src.server})` : `${this.name} (VIP)`,
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
}
