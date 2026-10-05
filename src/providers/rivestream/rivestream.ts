import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { rivestream } from 'kaizoku-core';

export class RivestreamProvider extends BaseProvider {
    readonly id = 'rivestream';
    readonly name = 'RiveStream';
    readonly enabled = true;
    readonly BASE_URL = 'https://www.rivestream.app';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://www.rivestream.app/'
    };

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
            const sources: Source[] = [];

            if (data && Array.isArray(data.sources)) {
                const defaultHeaders = data.headers || {};
                for (const src of data.sources) {
                    const qLower = (src.quality || '').toLowerCase();
                    const sLower = (src.server || '').toLowerCase();
                    const urlLower = (src.url || '').toLowerCase();

                    // Filter out dead, silent, and Indian/Hindi/Tamil dubbed servers
                    if (
                        sLower.includes('citadel') || urlLower.includes('hlnom.com') || urlLower.includes('klnwm.com') ||
                        sLower.includes('vanguard') || urlLower.includes('cheaptruckrepairs') ||
                        sLower.includes('apogee') || urlLower.includes('rousav.tech') ||
                        sLower.includes('solstice') || sLower.includes('pulse') || sLower.includes('hindicast') ||
                        sLower.includes('guru') || sLower.includes('asiacloud') ||
                        qLower.includes('hindi') || qLower.includes('punjabi') || qLower.includes('tamil') || qLower.includes('telugu') ||
                        sLower.includes('hindi') || sLower.includes('punjabi') || sLower.includes('tamil') || sLower.includes('telugu')
                    ) {
                        continue;
                    }

                    // Proxy streams that require Referer/Origin headers (e.g. boomchick, bluevelvet)
                    let streamUrl = src.url;
                    const streamHeaders = src.headers || defaultHeaders;
                    if (urlLower.includes('boomchick.org') || urlLower.includes('bluevelvet.space') || (streamHeaders && Object.keys(streamHeaders).length > 0)) {
                        streamUrl = this.createProxyUrl(src.url, streamHeaders);
                    }

                    sources.push({
                        url: streamUrl,
                        quality: src.quality || 'auto',
                        type: getSourceType(src.url, src.isM3U8),
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: src.server ? `${this.name} (${src.server})` : this.name,
                            id: this.id
                        }
                    });
                }
            }
            return { sources, subtitles: [], diagnostics: [] };
        } catch (e) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
