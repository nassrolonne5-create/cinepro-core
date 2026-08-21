import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';

export class MultiEmbedProvider extends BaseProvider {
    readonly id = 'multiembed';
    readonly name = 'MultiEmbed';
    readonly enabled = true;

    readonly BASE_URL = 'https://multiembed.mov';

    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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

    private async getSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            const embedUrl = this.buildEmbedUrl(media);
            const response = await fetch(embedUrl, { headers: this.HEADERS });

            if (!response.ok) {
                return this.emptyResult(`HTTP error ${response.status}`);
            }

            const html = await response.text();
            
            // Extract iframe src
            const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
            if (!iframeMatch || !iframeMatch[1]) {
                return this.emptyResult('No iframe found on embed page');
            }
            
            const iframeSrc = iframeMatch[1].startsWith('//') ? `https:${iframeMatch[1]}` : iframeMatch[1];

            const streamUrl = await this.extractStreamFromIframe(iframeSrc);
            
            if (!streamUrl) {
                return this.emptyResult('Failed to extract stream URL.');
            }

            const sources: Source[] = [
                {
                    url: this.createProxyUrl(streamUrl, this.HEADERS),
                    type: streamUrl.includes('.m3u8') ? 'hls' : 'mp4',
                    quality: 'Auto',
                    audioTracks: [{ label: 'Original', language: 'Auto' }],
                    provider: { id: this.id, name: this.name }
                }
            ];

            return {
                sources,
                subtitles: [],
                diagnostics: []
            };
        } catch (e) {
            return this.emptyResult(e instanceof Error ? e.message : 'Unknown error');
        }
    }
    
    private async extractStreamFromIframe(iframeUrl: string): Promise<string | null> {
        try {
            const response = await fetch(iframeUrl, { headers: { ...this.HEADERS, Referer: this.BASE_URL } });
            const html = await response.text();
            
            // Try to find m3u8 in plain text
            const m3u8Match = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8)/);
            if (m3u8Match) {
                return m3u8Match[1];
            }
            return null;
        } catch {
             return null;
        }
    }

    private buildEmbedUrl(media: ProviderMediaObject): string {
        if (media.type === 'movie') {
            return `${this.BASE_URL}/directstream.php?video_id=${media.tmdbId}&tmdb=1`;
        }
        return `${this.BASE_URL}/directstream.php?video_id=${media.tmdbId}&tmdb=1&s=${media.s}&e=${media.e}`;
    }

    private emptyResult(message: string): ProviderResult {
        return {
            sources: [],
            subtitles: [],
            diagnostics: [{ code: 'PROVIDER_ERROR', message: `${this.name}: ${message}`, field: '', severity: 'error' }]
        };
    }

    async healthCheck(): Promise<boolean> {
        try {
            const res = await fetch(this.BASE_URL, { method: 'HEAD', headers: this.HEADERS });
            return res.status === 200;
        } catch {
            return false;
        }
    }
}
