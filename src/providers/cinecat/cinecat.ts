import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { rivestream } from 'kaizoku-core';

export class CinecatProvider extends BaseProvider {
    readonly id = 'cinecat';
    readonly name = 'CineCat';
    readonly enabled = true;
    readonly BASE_URL = 'https://beta.cinecat.eu';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://beta.cinecat.eu/',
        'Origin': 'https://beta.cinecat.eu'
    };

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
        try {
            const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 4500));
            const data: any = await Promise.race([
                rivestream.fetchSources(media.tmdbId, media.type, media.s, media.e),
                timeout
            ]);

            const sources: Source[] = [];
            const seenUrls = new Set<string>();

            if (data && Array.isArray(data.sources)) {
                const defaultHeaders = data.headers || {};
                for (const src of data.sources) {
                    if (!src?.url) continue;

                    const qLower = (src.quality || '').toLowerCase();
                    const sLower = (src.server || '').toLowerCase();
                    const urlLower = (src.url || '').toLowerCase();

                    // Skip expired/dead boomchick and streamflix servers
                    if (urlLower.includes('boomchick') || urlLower.includes('streamflix') || sLower.includes('tcloud')) {
                        continue;
                    }

                    // Exclude non-English audio dubs
                    if (
                        qLower.includes('hindi') || qLower.includes('punjabi') || qLower.includes('tamil') || qLower.includes('telugu') ||
                        sLower.includes('hindi') || sLower.includes('punjabi') || sLower.includes('tamil') || sLower.includes('telugu')
                    ) {
                        continue;
                    }

                    if (seenUrls.has(src.url)) continue;
                    seenUrls.add(src.url);

                    let streamUrl = src.url;
                    const streamHeaders = src.headers || defaultHeaders || {};

                    if (src.url.includes('bluevelvet.space')) {
                        const requiredHeaders: Record<string, string> = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': 'https://www.bluevelvet.space/',
                            'Origin': 'https://www.bluevelvet.space',
                            ...streamHeaders
                        };
                        const proxyData = JSON.stringify({ url: src.url, headers: requiredHeaders });
                        streamUrl = `/v1/proxy?data=${encodeURIComponent(proxyData)}`;
                    }

                    const isZephyr = sLower.includes('zephyr') || urlLower.includes('bluevelvet') || qLower.includes('4k');
                    const serverLabel = isZephyr ? 'Zephyr 4K' : (src.server ? `${src.server}` : 'Prime');
                    const qualityLabel = isZephyr ? '4K HDR' : (src.quality || '1080p');

                    sources.push({
                        url: streamUrl + (streamUrl.includes('?') ? '&' : '?') + 'provider=' + this.id + '&ext=' + (src.isM3U8 || src.url.includes('.m3u8') ? '.m3u8' : '.mp4'),
                        quality: qualityLabel,
                        type: getSourceType(src.url, src.isM3U8),
                        server: serverLabel,
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: `${this.name} (${serverLabel})`,
                            id: `${this.id}-${serverLabel.toLowerCase().replace(/[^a-z0-9]/g, '')}`
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
