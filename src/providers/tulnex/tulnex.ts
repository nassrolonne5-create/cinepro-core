import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source,
    SourceType,
    Subtitle
} from '@omss/framework';
import { decryptPayload } from './decrypt.js';
import { TulnexApiResponse } from './tulnex.types.js';
import { generateRandomUserAgent } from '../../utils/ua.js';

export class TulnexProvider extends BaseProvider {
    readonly id = 'tulnex';
    readonly name = 'Tulnex';
    readonly enabled = true;

    readonly BASE_URL = 'https://api.tulnex.com';
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

            const response = await fetch(this.BASE_URL, {
                headers: this.HEADERS
            });
            if (!response.ok) {
                return this.emptyResult(`HTTP error: ${response.status}`);
            }

            const pageText = await response.text();

            const serversMatch = pageText.match(/var\s+servers\s*=\s*(\[.*?\])/);
            if (!serversMatch) {
                return this.emptyResult('Could not parse servers array');
            }
            const servers: string[] = JSON.parse(serversMatch[1]);
            const results = await Promise.all(
                servers.map((s) => this.fetchFromServer(s, media))
            );
            const combined: ProviderResult = {
                sources: [],
                subtitles: [],
                diagnostics: []
            };

            for (const r of results) {
                if (r.sources) combined.sources.push(...r.sources);
                if (r.subtitles) combined.subtitles.push(...r.subtitles);
                if (r.diagnostics) combined.diagnostics.push(...r.diagnostics);
            }

            if (combined.sources.length === 0) {
                combined.diagnostics.push({
                    code: 'PROVIDER_ERROR',
                    message: `${this.name}: No playable sources found across all servers.`,
                    field: '',
                    severity: 'error'
                });
            }

            return combined;
        } catch (e) {
            return this.emptyResult(
                e instanceof Error ? e.message : 'Unknown error'
            );
        }
    }

    private async fetchFromServer(
        serverName: string,
        media: ProviderMediaObject
    ): Promise<ProviderResult> {
        try {
            const url =
                media.type === 'movie'
                    ? this.BASE_URL + '/' + serverName + '/movie/' + media.tmdbId
                    : this.BASE_URL +
                      '/' +
                      serverName +
                      '/tv/' +
                      media.tmdbId +
                      '/' +
                      media.s +
                      '/' +
                      media.e;

            const res = await fetch(url, { headers: this.HEADERS });
            if (!res.ok) return this.emptyResult(`HTTP ${res.status}`);

            const json = (await res.json()) as { data: string };
            const decryptedJsonStr = await decryptPayload(json.data);
            const data = decryptedJsonStr as any; // The structure changed
            if (!data.stream || data.stream.length === 0) {
                return this.emptyResult('No streams in decrypted payload');
            }

            const sources: Source[] = data.stream.map((streamObj: any) => {
                const urlStr = streamObj.file || '';
                const sourceType: SourceType =
                    urlStr.includes('mp4') ||
                    urlStr.includes('mkv')
                        ? 'mp4'
                        : 'hls';
                return {
                    url: this.createProxyUrl(
                        urlStr,
                        this.HEADERS,
                    ),
                    type: sourceType,
                    quality: streamObj.label || 'Auto',
                    audioTracks: [
                        {
                            label: data.server || 'Unknown',
                            language: 'unknown'
                        }
                    ],
                    provider: {
                        id: this.id,
                        name: this.name
                    }
                };
            });

            const subtitles: Subtitle[] = (data.subtitles || []).map((sub: any) => ({
                url: sub.file || '',
                label: sub.label || 'Unknown',
                format: 'vtt'
            }));

            return { sources, subtitles, diagnostics: [] };
        } catch (e) {
            return this.emptyResult(
                e instanceof Error ? e.message : 'Unknown fetch/decrypt error'
            );
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
