import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source,
    SourceType,
    Subtitle
} from '@omss/framework';
import { generateRandomUserAgent } from '../../utils/ua.js';
import { encryptItemId } from './encrypt.js';

const PROXY_PREFIX = 'https://proxy.vidrock.store/';

export class VidrockProvider extends BaseProvider {
    readonly id = 'vidrock';
    readonly name = 'VidRock';
    readonly enabled = true;

    readonly BASE_URL = 'https://vidrock.net';
    readonly API_BASE_URL = 'https://vidrock.net/api';
    readonly SUB_BASE_URL = 'https://subtitle.vidrock.net';

    readonly HEADERS = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json, text/javascript, */*; q=0.01'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return await this.getSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return await this.getSources(media);
    }

    private async getSources(
        media: ProviderMediaObject
    ): Promise<ProviderResult> {
        try {
            this.HEADERS['User-Agent'] = generateRandomUserAgent();

            const url =
                media.type === 'movie'
                    ? `${this.API_BASE_URL}/v2/movie/${media.tmdbId}`
                    : `${this.API_BASE_URL}/v2/tv/${media.tmdbId}/${media.s}/${media.e}`;

            const response = await fetch(url, { headers: this.HEADERS, signal: AbortSignal.timeout(5000) });
            if (!response.ok) {
                return this.emptyResult('Failed to fetch page');
            }

            const pageText = await response.text();

            const serversMatch = pageText.match(/var\s+servers\s*=\s*(\[.*?\])/);
            if (!serversMatch) {
                return this.emptyResult('No servers array found');
            }

            let servers: any[];
            try {
                servers = JSON.parse(serversMatch[1]);
            } catch {
                return this.emptyResult('Failed to parse servers array');
            }

            const combinedSources: Source[] = [];
            
            for (const server of servers) {
                 try {
                     if (server && server.url) {
                        let finalUrl = server.url;
                        if (server.url.startsWith(PROXY_PREFIX)) {
                            const b64 = server.url.substring(
                                PROXY_PREFIX.length
                            );
                            finalUrl = atob(b64);
                        }

                        const type: SourceType = finalUrl.includes('.mp4') || finalUrl.includes('.mkv') ? 'mp4' : 'hls';
                        
                        combinedSources.push({
                            url: this.createProxyUrl(finalUrl, {
                                'User-Agent': this.HEADERS['User-Agent']
                            }),
                            type,
                            quality: 'Auto',
                            audioTracks: [{
                                label: server.name || 'Unknown',
                                language: 'unknown'
                            }],
                            provider: {
                                id: this.id,
                                name: this.name
                            }
                        });
                     }
                 } catch(e) {
                     // ignore errors for specific servers
                 }
            }

            const subtitles = await this.getSubtitles(media);

            return {
                sources: combinedSources,
                subtitles,
                diagnostics: []
            };
        } catch (e) {
            return this.emptyResult(
                e instanceof Error ? e.message : 'Unknown error'
            );
        }
    }

    private async getSubtitles(media: ProviderMediaObject): Promise<Subtitle[]> {
        try {
             let subUrl = '';
             if (media.type === 'tv') {
                 subUrl = `${this.SUB_BASE_URL}/v2/tv/${media.tmdbId}/${media.s}/${media.e}`;
             } else {
                 subUrl = `${this.SUB_BASE_URL}/v2/movie/${media.tmdbId}`;
             }
             
             const response = await fetch(subUrl, { headers: this.HEADERS, signal: AbortSignal.timeout(5000) });
             if (!response.ok) return [];
             
             const json = await response.json() as { subtitles?: Array<{file: string, label: string}>};
             if (!json.subtitles) return [];
             
             return json.subtitles.map(sub => ({
                 url: this.createProxyUrl(sub.file, { 'User-Agent': this.HEADERS['User-Agent'] }),
                 label: sub.label,
                 format: 'vtt'
             }));
        } catch (e) {
             return [];
        }
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
            const response = await fetch(this.BASE_URL, {
                method: 'HEAD',
                headers: this.HEADERS
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }
}
