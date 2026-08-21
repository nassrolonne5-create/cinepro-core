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
import type {
    deltaResponse,
    ServerMap
} from './vidnest.types.js';

export class VidnestProvider extends BaseProvider {
    readonly id = 'vidnest';
    readonly name = 'VidNest';
    readonly enabled = true;

    readonly BASE_URL = 'https://vidnest.store';
    readonly API_BASE_URL = 'https://vidnest.store/api';
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

            const response = await fetch(url, { headers: this.HEADERS });
            if (!response.ok) {
                return this.emptyResult('Failed to fetch page');
            }

            const pageText = await response.text();
            
            // Extract configs and initial server config
            let serverConfig: any = null;
            
            try {
                 const serverMatch = pageText.match(/var\s+server\s*=\s*(\{.*?\});/);
                 if (serverMatch) {
                     serverConfig = JSON.parse(serverMatch[1]);
                 }
            } catch (e) {
                 // Ignore parsing error
            }

            let initialConfig: any = null;
            try {
                 const configMatch = pageText.match(/var\s+config\s*=\s*(\{.*?\});/);
                 if (configMatch) {
                     initialConfig = JSON.parse(configMatch[1]);
                 }
            } catch (e) {
                 // Ignore
            }

            const combinedSources: Source[] = [];
            const subtitles: Subtitle[] = [];

            if (initialConfig) {
                 const sources = this.extractSourcesFromConfig(initialConfig);
                 combinedSources.push(...sources);
                 
                 const subs = this.extractSubtitlesFromConfig(initialConfig);
                 subtitles.push(...subs);
            }
            
            if (serverConfig) {
                 try {
                     const apiReqUrl = `${this.API_BASE_URL}/v2/server/${serverConfig.id}`;
                     const apiRes = await fetch(apiReqUrl, { headers: this.HEADERS });
                     if (apiRes.ok) {
                          const apiJson = await apiRes.json() as { data: string };
                          // Decryption is likely needed here for full sources, but ignoring for now 
                          // as it's complex without the specific decrypt method.
                     }
                 } catch(e) {
                      // Ignore
                 }
            }
            
            if (combinedSources.length === 0) {
                 return this.emptyResult('No sources found');
            }

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
    
    private extractSourcesFromConfig(config: any): Source[] {
        const resultSources: Source[] = [];
        
        if (config.sources && Array.isArray(config.sources)) {
            for (const s of config.sources) {
                if (s.file || s.url) {
                    const url = s.file || s.url || '';
                    const type: SourceType = url.includes('.mp4') || url.includes('.mkv') ? 'mp4' : 'hls';
                    resultSources.push({
                         url: this.createProxyUrl(url, this.HEADERS),
                         type,
                         quality: s.label || 'Auto',
                         audioTracks: [{
                             label: 'Original',
                             language: 'unknown'
                         }],
                         provider: {
                             id: this.id,
                             name: this.name
                         }
                    });
                }
            }
        }
        return resultSources;
    }
    
    private extractSubtitlesFromConfig(config: any): Subtitle[] {
        const resultSubtitles: Subtitle[] = [];
        if (config.subtitles && Array.isArray(config.subtitles)) {
            for (const sub of config.subtitles) {
                 if (sub.file) {
                     resultSubtitles.push({
                         url: this.createProxyUrl(sub.file, this.HEADERS),
                         label: sub.label || 'Unknown',
                         format: 'vtt'
                     });
                 }
            }
        }
        return resultSubtitles;
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
