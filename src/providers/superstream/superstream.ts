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
        (media as any).s = Number((media as any).season || (media as any).s || 1);
        (media as any).e = Number((media as any).episode || (media as any).e || 1);
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

        const [v2Settled] = await Promise.allSettled([
            (async () => {
                const { resolveVidnestV2 } = await import('../../utils/vidnestV2.js');
                return resolveVidnestV2(
                    media,
                    this.id,
                    this.name,
                    (u, h) => this.createProxyUrl(u, h),
                    [
                        { name: 'VIP 4K', path: 'flixhq' },
                        { name: 'SuperCloud', path: 'nextgencloudfabric' }
                    ],
                    3200
                );
            })()
        ]);

        const v2Sources = v2Settled.status === 'fulfilled' ? v2Settled.value.sources : [];
        const v2Subs = v2Settled.status === 'fulfilled' ? v2Settled.value.subtitles : [];
        const { mergeProviderSources } = await import('../../utils/vidnestV2.js');

        return {
            sources: mergeProviderSources(allSources, v2Sources),
            subtitles: v2Subs,
            diagnostics: []
        };
    }
}
