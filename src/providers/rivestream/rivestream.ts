import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { rivestream } from 'kaizoku-core';

/**
 * Unwraps third-party proxy URLs (such as proxy.valhallastream.com/m3u8?url=...&headers=...)
 * and preserves the exact upstream headers required by the target CDN.
 */
export function unwrapAndBuildProxyUrl(
    rawUrl: string,
    fallbackHeaders: Record<string, string> | undefined,
    createProxyFn: (url: string, headers?: Record<string, string>) => string
): string {
    try {
        const parsed = new URL(rawUrl);
        if (parsed.hostname.includes('valhallastream.com') && parsed.searchParams.get('url')) {
            const innerUrl = parsed.searchParams.get('url')!;
            const rawInnerHeaders = parsed.searchParams.get('headers');
            if (innerUrl.includes('cine4k.mpddash.workers.dev')) {
                // cine4k workers.dev returns HTTP 200 when no Referer header is sent
                return createProxyFn(innerUrl, {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
                });
            }
            if (rawInnerHeaders) {
                try {
                    const innerHeaders = JSON.parse(rawInnerHeaders);
                    return createProxyFn(innerUrl, innerHeaders);
                } catch {}
            }
            return createProxyFn(innerUrl, fallbackHeaders);
        }
    } catch {}

    const lower = rawUrl.toLowerCase();
    if (lower.includes('cine4k.mpddash.workers.dev')) {
        return createProxyFn(rawUrl, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        });
    }

    if (
        lower.includes('bluevelvet.space') ||
        lower.includes('fastcloud.live') ||
        (fallbackHeaders && Object.keys(fallbackHeaders).length > 0)
    ) {
        return createProxyFn(rawUrl, fallbackHeaders);
    }

    return rawUrl;
}

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

                    // Filter out silent or non-English dubbed tracks while keeping Mirage 4K, PrimeVids, and English Citadel
                    if (
                        urlLower.includes('hlnom.com') || urlLower.includes('klnwm.com') ||
                        sLower.includes('vanguard') || urlLower.includes('cheaptruckrepairs') ||
                        sLower.includes('apogee') || urlLower.includes('rousav.tech') ||
                        sLower.includes('solstice') || sLower.includes('pulse') || sLower.includes('hindicast') ||
                        sLower.includes('guru') || sLower.includes('asiacloud') ||
                        urlLower.includes('boomchick') || urlLower.includes('streamflix') ||
                        urlLower.includes('onlinevisibilitysystem.site') || urlLower.includes('highperformanceread.com') ||
                        qLower.includes('hindi') || qLower.includes('punjabi') || qLower.includes('tamil') || qLower.includes('telugu') ||
                        sLower.includes('hindi') || sLower.includes('punjabi') || sLower.includes('tamil') || sLower.includes('telugu')
                    ) {
                        continue;
                    }

                    const streamHeaders = src.headers || defaultHeaders;
                    const streamUrl = unwrapAndBuildProxyUrl(
                        src.url,
                        streamHeaders,
                        (u, h) => this.createProxyUrl(u, h)
                    );

                    const serverName = src.server ? `${this.name} (${src.server})` : `${this.name} (Mirage)`;
                    sources.push({
                        url: streamUrl,
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
            return { sources, subtitles: [], diagnostics: [] };
        } catch (e) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
