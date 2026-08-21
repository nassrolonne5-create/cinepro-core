import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source,
    SourceType,
    Subtitle
} from '@omss/framework';
import * as cheerio from 'cheerio';
import { generateRandomUserAgent } from '../../utils/ua.js';
function extractDomain(url: string) { try { return new URL(url).hostname; } catch { return url; } }

export class FshareProvider extends BaseProvider {
    readonly id = 'fsharetv';
    readonly name = 'FshareTV';
    readonly enabled = true;

    readonly BASE_URL = 'https://fsharetv.co';

    readonly HEADERS = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: `${this.BASE_URL}/`,
        Origin: this.BASE_URL
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.getSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.getSources(media);
    }

    private async getSources(
        media: ProviderMediaObject
    ): Promise<ProviderResult> {
        try {
            this.HEADERS['User-Agent'] = generateRandomUserAgent();

            if (!media.imdbId) {
                return this.emptyResult(
                    `No watch page found for IMDb ID ${media.imdbId}`
                );
            }
            let watchUrl = '';
            
            // Search first to get the actual URL structure
            const searchQuery = encodeURIComponent(media.title.toLowerCase());
            const searchResponse = await fetch(`${this.BASE_URL}/search?q=${searchQuery}`, { headers: this.HEADERS });
            if (searchResponse.ok) {
                const searchHtml = await searchResponse.text();
                const $search = cheerio.load(searchHtml);
                let foundHref = '';
                
                $search('a').each((_, el) => {
                    const href = $search(el).attr('href');
                    if (href && href.includes(`tt${media.imdbId?.replace('tt', '')}`)) {
                        foundHref = href;
                    }
                });
                
                if (foundHref) {
                    watchUrl = foundHref.startsWith('http') ? foundHref : `${this.BASE_URL}${foundHref}`;
                }
            }
            
            // Fallback to old guessing method if search fails
            if (!watchUrl) {
                const imdbId = media.imdbId;
                if (media.type === 'movie') {
                    watchUrl = `${this.BASE_URL}/movie/${media.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-episode-1-${imdbId}`;
                } else if (media.type === 'tv') {
                    watchUrl = `${this.BASE_URL}/tv/${imdbId}-season-${media.s}-episode-${media.e}`;
                }
            }

            const response = await fetch(watchUrl, { headers: this.HEADERS });
            if (!response.ok) {
                if (response.status === 404) {
                    return this.emptyResult('Movie or episode not found');
                }
                throw new Error(`Failed to load page: ${response.status}`);
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            const iframeSrc = $('iframe').first().attr('src');
            if (!iframeSrc) {
                return this.emptyResult('No iframe found on watch page');
            }

            const streamUrl = await this.extractStreamFromIframe(iframeSrc);
            if (!streamUrl) {
                return this.emptyResult('Failed to extract stream URL');
            }

            const sourceType: SourceType =
                streamUrl.includes('m3u8') || streamUrl.includes('hls')
                    ? 'hls'
                    : 'mp4';

            const sources: Source[] = [
                {
                    url: this.createProxyUrl(streamUrl, this.HEADERS),
                    type: sourceType,
                    quality: 'Auto',
                    audioTracks: [{ label: 'Original', language: 'Auto' }],
                    provider: { id: this.id, name: this.name }
                }
            ];

            const subtitles = await this.extractSubtitles(html);

            return {
                sources,
                subtitles,
                diagnostics: []
            };
        } catch (e) {
            return this.emptyResult(
                e instanceof Error ? e.message : 'Unknown provider error'
            );
        }
    }

    private async extractStreamFromIframe(
        iframeUrl: string
    ): Promise<string | null> {
        try {
            const domain = extractDomain(iframeUrl);
            const headers = { ...this.HEADERS, Referer: this.BASE_URL };

            const response = await fetch(iframeUrl, { headers });
            if (!response.ok) return null;

            const html = await response.text();

            const fileMatch = html.match(/file:\s*["']([^"']+)["']/);
            if (fileMatch && fileMatch[1]) {
                const url = fileMatch[1];
                if (url.startsWith('//')) return `https:${url}`;
                if (url.startsWith('/')) return `https://${domain}${url}`;
                return url;
            }

            const sourceMatch = html.match(/<source[^>]+src=["']([^"']+)["']/i);
            if (sourceMatch && sourceMatch[1]) {
                const url = sourceMatch[1];
                if (url.startsWith('//')) return `https:${url}`;
                if (url.startsWith('/')) return `https://${domain}${url}`;
                return url;
            }

            return null;
        } catch {
            return null;
        }
    }

    private async extractSubtitles(html: string): Promise<Subtitle[]> {
        const subtitles: Subtitle[] = [];
        try {
            const $ = cheerio.load(html);
            $('track[kind="captions"]').each((_, el) => {
                const src = $(el).attr('src');
                const label = $(el).attr('label') || 'Unknown';
                const srclang = $(el).attr('srclang');

                if (src) {
                    const rawUrl = src.startsWith('//')
                        ? `https:${src}`
                        : src.startsWith('/')
                          ? `${this.BASE_URL}${src}`
                          : src;
                    subtitles.push({
                        url: this.createProxyUrl(rawUrl, this.HEADERS),
                        label,
                        format: rawUrl.endsWith('.vtt') ? 'vtt' : 'srt'
                    });
                }
            });
        } catch {
            // Ignore subtitle extraction errors
        }
        return subtitles;
    }

    private emptyResult(message: string): ProviderResult {
        return {
            sources: [],
            subtitles: [],
            diagnostics: [
                {
                    code: 'PROVIDER_ERROR',
                    message: `${this.name}: ${message}`,
                    field: '',
                    severity: 'error'
                }
            ]
        };
    }

    async healthCheck(): Promise<boolean> {
        try {
            const res = await fetch(this.BASE_URL, {
                method: 'HEAD',
                headers: this.HEADERS
            });
            return res.status === 200;
        } catch {
            return false;
        }
    }
}
