import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { rivestream } from 'kaizoku-core';
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
                return { sources, subtitles: [], diagnostics: [] };
            }
        } catch {}

        return { sources: [], subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
