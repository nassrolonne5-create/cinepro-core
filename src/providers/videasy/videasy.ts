import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { rivestream, vidnest } from 'kaizoku-core';
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
        return this.fetchSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            const data = await rivestream.fetchSources(media.tmdbId, media.type, media.s, media.e);
            if (data?.sources?.length) {
                const sources: Source[] = [];
                for (const src of data.sources) {
                    const uLower = (src.url || '').toLowerCase();
                    const qLower = (src.quality || '').toLowerCase();
                    const sLower = (src.server || '').toLowerCase();

                    // Filter out dead, silent, and non-English dubs
                    if (
                        sLower.includes('citadel') || sLower.includes('apogee') || sLower.includes('vanguard') ||
                        sLower.includes('primevids') || uLower.includes('boomchick') || uLower.includes('streamflix') ||
                        uLower.includes('hbsxcn.com') || uLower.includes('hlnom.com') || uLower.includes('klnwm.com') ||
                        uLower.includes('cheaptruckrepairs') || uLower.includes('rousav') ||
                        uLower.includes('tiktoks') || uLower.includes('animanga') || uLower.includes('aoneroom') ||
                        qLower.includes('hindi') || qLower.includes('tamil') || qLower.includes('telugu') ||
                        sLower.includes('hindi') || sLower.includes('tamil')
                    ) {
                        continue;
                    }

                    const streamUrl = (data.headers && Object.keys(data.headers).length > 0)
                        ? this.createProxyUrl(src.url, data.headers)
                        : src.url;

                    sources.push({
                        url: streamUrl,
                        quality: src.quality || 'Auto',
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

        // Fallback upstream mirror via vidnest
        try {
            const data = await vidnest.fetchSources(media.tmdbId, media.type, media.s, media.e);
            if (data?.sources?.length) {
                const sources: Source[] = data.sources.map(src => {
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
