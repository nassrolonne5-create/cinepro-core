import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source,
    Subtitle
} from '@omss/framework';
import { generateRandomUserAgent } from '../../utils/ua.js';
import { decryptResponse } from './decryptor.js';

export class VideasyProvider extends BaseProvider {
    readonly id = 'Videasy';
    readonly name = 'Videasy';
    readonly enabled = true;

    readonly BASE_URL = 'https://videasy.net';
    readonly API_URL = 'https://api.videasy.net';

    readonly HEADERS = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: `${this.BASE_URL}/`,
        Origin: this.BASE_URL
    };

    readonly VIDEASY_SERVERS = [
        `${this.API_URL}/api/v1/movie`,
        `${this.API_URL}/api/v2/movie`,
        `${this.API_URL}/api/v1/tv`,
        `${this.API_URL}/api/v2/tv`
    ];

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
        this.HEADERS['User-Agent'] = generateRandomUserAgent();

        const results = await Promise.allSettled(
            this.VIDEASY_SERVERS.filter((s) => s.includes(media.type)).map(
                (serverUrl) => this.fetchFromServer(serverUrl, media)
            )
        );

        const sources: Source[] = [];
        const subtitles: Subtitle[] = [];
        const diagnostics: NonNullable<ProviderResult['diagnostics']> = [];

        let successCount = 0;

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                sources.push(...result.value.sources);
                subtitles.push(...result.value.subtitles);
                successCount++;
            } else if (result.status === 'rejected') {
                diagnostics.push({
                    code: 'PROVIDER_ERROR',
                    message: `Videasy server failed: ${result.reason}`,
                    field: '',
                    severity: 'warning'
                });
            }
        }

        if (successCount === 0 || sources.length === 0) {
            return this.emptyResult('all videasy servers returned no sources');
        }

        return { sources, subtitles, diagnostics };
    }

    private async fetchFromServer(
        serverUrl: string,
        media: ProviderMediaObject
    ): Promise<{ sources: Source[]; subtitles: Subtitle[] } | null> {
        const url = this.buildApiUrl(serverUrl, media);

        const response = await fetch(url, {
            headers: this.HEADERS,
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status} from ${serverUrl}`);
        }

        let body = await response.json() as any;
        
        // Handling encrypted response
        if (body.encrypted && body.data) {
            const decrypted = await decryptResponse(body.data, media.tmdbId.toString());
            if (!decrypted) {
                return null;
            }
            body = decrypted;
        }

        const rawSources = body.sources || [];
        const rawSubtitles = body.subtitles || [];

        if (rawSources.length === 0) return null;

        const sources: Source[] = rawSources.map((s: any) => {
            const urlStr = s.file || s.url || '';
            const type = urlStr.includes('.m3u8') ? 'hls' : 'mp4';
            return {
                url: this.createProxyUrl(urlStr, this.HEADERS),
                type,
                quality: s.label || s.quality || 'Auto',
                audioTracks: [
                    {
                        label: 'Original',
                        language: 'unknown'
                    }
                ],
                provider: {
                    id: this.id,
                    name: this.name
                }
            };
        });

        const subtitles: Subtitle[] = rawSubtitles.map((s: any) => {
            const urlStr = s.file || s.url || '';
            return {
                url: this.createProxyUrl(urlStr, {}),
                label: s.label || s.lang || s.language || 'Unknown',
                format: urlStr.endsWith('.vtt') ? 'vtt' : 'srt'
            };
        });

        return { sources, subtitles };
    }

    private buildApiUrl(serverUrl: string, media: ProviderMediaObject): string {
        const tmdbId = media.tmdbId;
        if (media.type === 'movie') {
            return `${serverUrl}/${tmdbId}`;
        } else if (media.type === 'tv') {
            const s = media.s || 1;
            const e = media.e || 1;
            return `${serverUrl}/${tmdbId}/${s}/${e}`;
        }
        return `${serverUrl}/${tmdbId}`;
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
