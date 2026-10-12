import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidgod, rivestream, vidnest } from 'kaizoku-core';
import { getSourceType } from '../../utils/streamType.js';

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

        // Try StreamFlix full-length HD stream
        try {
            const data: any = await Promise.race([
                vidgod.fetchSources(media.tmdbId, media.type, media.s, media.e),
                timeout(4000)
            ]);
            if (data?.sources?.length) {
                const sources: Source[] = [];
                for (const src of data.sources) {
                    const uLower = (src.url || '').toLowerCase();
                    if (uLower.includes('streamflixserver.site') || uLower.includes('480ptvseries') || uLower.includes('goodstream.cc') || uLower.includes('tiktoks') || uLower.includes('aoneroom') || uLower.includes('boomchick')) continue;
                    const serverName = src.server ? `${this.name} (${src.server})` : `${this.name} (Mirage)`;
                    sources.push({
                        url: src.url,
                        quality: src.quality || 'Auto',
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

        // Fallback to RiveStream full-length stream
        try {
            const data: any = await Promise.race([
                rivestream.fetchSources(media.tmdbId, media.type, media.s, media.e),
                timeout(4000)
            ]);
            if (data?.sources?.length) {
                const sources: Source[] = [];
                const defaultHeaders = data.headers || {};
                for (const src of data.sources) {
                    const uLower = (src.url || '').toLowerCase();
                    const sLower = (src.server || '').toLowerCase();
                    if (
                        sLower.includes('citadel') || sLower.includes('vanguard') || sLower.includes('apogee') ||
                        sLower.includes('primevids') || uLower.includes('boomchick') || uLower.includes('streamflix') ||
                        uLower.includes('cheaptruckrepairs') || uLower.includes('rousav') ||
                        uLower.includes('klnwm') || uLower.includes('hlnom') || uLower.includes('tiktoks') || uLower.includes('aoneroom')
                    ) continue;

                    const streamHeaders = src.headers || defaultHeaders;
                    const url = (uLower.includes('bluevelvet.space') || (streamHeaders && Object.keys(streamHeaders).length > 0))
                        ? this.createProxyUrl(src.url, streamHeaders)
                        : src.url;

                    const serverName = src.server ? `${this.name} (${src.server})` : `${this.name} (Apex)`;
                    sources.push({
                        url,
                        quality: src.quality || 'Auto',
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

        // Fallback upstream mirror via vidnest
        try {
            const data: any = await Promise.race([
                vidnest.fetchSources(media.tmdbId, media.type, media.s, media.e),
                timeout(4000)
            ]);
            if (data?.sources?.length) {
                const sources: Source[] = data.sources.map((src: any) => {
                    const ext = src.isM3U8 || src.url.includes('.m3u8') ? '.m3u8' : '.mp4';
                    return {
                        url: src.url + (src.url.includes('?') ? '&' : '?') + 'provider=' + this.id + '&ext=' + ext,
                        quality: src.quality || 'auto',
                        type: getSourceType(src.url, src.isM3U8),
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: `${this.name} (Mirror)`,
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
