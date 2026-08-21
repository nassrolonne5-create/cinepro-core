import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source,
    SourceType,
    Subtitle
} from '@omss/framework';

export class PoprProvider extends BaseProvider {
    readonly id = 'popr';
    readonly name = 'Popr';
    readonly enabled = true;

    readonly BASE_URL = 'https://popr.tv';
    readonly API_URL = 'https://api.popr.tv';

    readonly HEADERS = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        Origin: this.BASE_URL,
        Referer: `${this.BASE_URL}/`
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
            const searchUrl = `${this.API_URL}/search?query=${encodeURIComponent(media.title)}`;
            const searchRes = await fetch(searchUrl, {
                headers: this.HEADERS
            });

            if (!searchRes.ok) {
                return this.emptyResult(`Search failed with status ${searchRes.status}`);
            }

            const searchData = await searchRes.json() as any;
            if (!searchData || !searchData.results || searchData.results.length === 0) {
                 return this.emptyResult('No results found for search');
            }

            const matchedResult = searchData.results.find((r: any) => r.tmdb_id === media.tmdbId);
            if (!matchedResult) {
                 return this.emptyResult('No matched result found in search');
            }
            
            const itemUrl = `${this.API_URL}/item?id=${matchedResult.id}`;
            const itemRes = await fetch(itemUrl, {
                 headers: this.HEADERS
            });
            
            if (!itemRes.ok) {
                 return this.emptyResult(`Item fetch failed with status ${itemRes.status}`);
            }
            
            const itemData = await itemRes.json() as any;
            if (!itemData || !itemData.streams || itemData.streams.length === 0) {
                 return this.emptyResult('No streams found in item');
            }
            
            let targetStream: any = null;
            if (media.type === 'movie') {
                targetStream = itemData.streams[0];
            } else {
                targetStream = itemData.streams.find((s: any) => s.season === media.s && s.episode === media.e);
            }
            
            if (!targetStream || !targetStream.url) {
                 return this.emptyResult('No target stream found');
            }

            const sourceType: SourceType =
                targetStream.url.includes('.mp4') || targetStream.url.includes('.mkv')
                    ? 'mp4'
                    : 'hls';

            const sources: Source[] = [
                {
                    url: this.createProxyUrl(targetStream.url, this.HEADERS),
                    type: sourceType,
                    quality: targetStream.quality || 'Auto',
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
                }
            ];

            const subtitles: Subtitle[] = (itemData.subtitles || []).map((sub: any) => ({
                url: this.createProxyUrl(sub.url, this.HEADERS),
                label: sub.label,
                format: sub.url.endsWith('.vtt') ? 'vtt' : 'srt'
            }));

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
