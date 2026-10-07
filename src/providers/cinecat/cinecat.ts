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
        return this.fetchSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            // Retrieve Cinecat-supported streams (Zephyr 4K & PrimeVids 1080p)
            const data = await rivestream.fetchSources(media.tmdbId, media.type, media.s, media.e);

            const sources: Source[] = [];
            const seenUrls = new Set<string>();

            if (data && Array.isArray(data.sources)) {
                const defaultHeaders = data.headers || {};
                for (const src of data.sources) {
                    if (!src?.url) continue;

                    const qLower = (src.quality || '').toLowerCase();
                    const sLower = (src.server || '').toLowerCase();
                    const urlLower = (src.url || '').toLowerCase();

                    // Only take Cinecat-relevant premium servers (Zephyr 4K HDR & PrimeVids)
                    const isZephyr = sLower.includes('zephyr') || urlLower.includes('bluevelvet') || qLower.includes('4k');
                    const isPrimeVids = sLower.includes('primevids') || urlLower.includes('boomchick') || sLower.includes('tcloud');

                    if (!isZephyr && !isPrimeVids) continue;

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

                    if (src.url.includes('bluevelvet.space') || src.url.includes('boomchick.org')) {
                        const requiredHeaders: Record<string, string> = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            ...streamHeaders
                        };
                        if (src.url.includes('bluevelvet.space')) {
                            requiredHeaders['Referer'] = 'https://www.bluevelvet.space/';
                            requiredHeaders['Origin'] = 'https://www.bluevelvet.space';
                        } else if (src.url.includes('boomchick.org')) {
                            requiredHeaders['Referer'] = 'https://boomchick.org/';
                            requiredHeaders['Origin'] = 'https://boomchick.org';
                        }
                        const proxyData = JSON.stringify({ url: src.url, headers: requiredHeaders });
                        streamUrl = `/v1/proxy?data=${encodeURIComponent(proxyData)}`;
                    }

                    const serverLabel = isZephyr ? 'Zephyr 4K' : (src.server ? `PrimeVids (${src.server})` : 'PrimeVids');
                    const qualityLabel = isZephyr ? '4K HDR' : (src.quality || '1080p');

                    sources.push({
                        url: streamUrl + (streamUrl.includes('?') ? '&' : '?') + 'provider=' + this.id + '&ext=' + (src.isM3U8 || src.url.includes('.m3u8') ? '.m3u8' : '.mp4'),
                        quality: qualityLabel,
                        type: getSourceType(src.url, src.isM3U8),
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: `${this.name} (${serverLabel})`,
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
