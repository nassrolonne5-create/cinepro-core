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
import { decrypt } from './decrypt.js';
import { StreamResponse } from './vidzee.types.js';

export class VidzeeProvider extends BaseProvider {
    readonly id = 'vidzee';
    readonly name = 'VidZee';
    readonly enabled = true;

    readonly BASE_URL = 'https://vidzee.store';
    readonly API_BASE_URL = 'https://vidzee.store/api';
    readonly SUB_BASE_URL = 'https://subtitle.vidzee.store';
    readonly DECRYPT_KEY_URL = 'https://raw.githubusercontent.com/cinepro-org/keys/main/vidzee_key.txt';

    readonly HEADERS = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json, text/javascript, */*; q=0.01'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    private async fetchDecryptionKey(): Promise<string | null> {
        try {
            const res = await fetch(this.DECRYPT_KEY_URL);
            if (!res.ok) return null;
            return await res.text();
        } catch {
            return null;
        }
    }

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

            const key = await this.fetchDecryptionKey();
            if (!key) return this.emptyResult('Failed to fetch decryption key');

            const url =
                media.type === 'movie'
                    ? `${this.API_BASE_URL}/v1/movie/${media.tmdbId}`
                    : `${this.API_BASE_URL}/v1/tv/${media.tmdbId}/${media.s}/${media.e}`;

            const response = await fetch(url, { headers: this.HEADERS });
            if (!response.ok) {
                return this.emptyResult('Failed to fetch page');
            }

            const json = (await response.json()) as { data: string };
            const decryptedJsonStr = await decrypt(json.data, key.trim());
            
            let data: any;
            try {
                 data = JSON.parse(decryptedJsonStr) as any;
            } catch {
                 return this.emptyResult('Failed to parse decrypted string');
            }

            if (!data.stream || data.stream.length === 0) {
                return this.emptyResult('No streams found');
            }

            const combinedSources: Source[] = data.stream.map((streamObj: any) => {
                const streamUrl = streamObj.file || '';
                const sourceType: SourceType =
                    streamUrl.includes('mp4') || streamUrl.includes('mkv')
                        ? 'mp4'
                        : 'hls';
                return {
                    url: this.createProxyUrl(streamUrl, {
                        'User-Agent': this.HEADERS['User-Agent']
                    }),
                    type: sourceType,
                    quality: 'Auto',
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

            const subtitles: Subtitle[] = (data.subtitles || []).map((sub: any) => ({
                url: this.createProxyUrl(sub.file, { 'User-Agent': this.HEADERS['User-Agent'] }),
                label: sub.label,
                format: 'vtt'
            }));

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
