import { BaseProvider } from '@omss/framework';
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult, Source } from '@omss/framework';

export class VidriftProvider extends BaseProvider {
    readonly id = 'vidrift';
    readonly name = 'VidRift';
    readonly enabled = true;
    
    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };
    
    readonly BASE_URL = 'https://embed.vidrift.in';
    readonly HEADERS = {
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': `${this.BASE_URL}/`,
        'Origin': this.BASE_URL,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0'
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.extractSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.extractSources(media);
    }

    private async extractSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const endpoint = media.type === 'tv'
            ? `${this.BASE_URL}/embed/tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}`
            : `${this.BASE_URL}/embed/movie/${media.tmdbId}`;

        const pageRes = await fetch(endpoint, {
            headers: { ...this.HEADERS, Accept: 'text/html' }
        });
        
        if (!pageRes.ok) throw new Error(`Failed to fetch page: ${pageRes.status}`);
        const html = await pageRes.text();
        
        const match = html.match(/embedMeta\s*=\s*(\{.*?\})/);
        if (!match || !match[1]) throw new Error("Failed to extract embedMeta token");
        
        const meta = JSON.parse(match[1]);
        const token = meta.playbackToken;
        if (!token) throw new Error("No playbackToken found");
        
        const providers = ['selfhost', 'vaplayer', 'vidgod', 'turbo'];
        const sources: Source[] = [];
        const diagnostics: any[] = [];
        
        const typePath = media.type === 'tv'
            ? `tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}`
            : `movie/${media.tmdbId}`;
            
        for (const p of providers) {
            try {
                const apiRes = await fetch(`${this.BASE_URL}/api/source/${typePath}?token=${encodeURIComponent(token)}&provider=${p}`, {
                    headers: {
                        ...this.HEADERS,
                        'Referer': endpoint
                    }
                });
                
                if (!apiRes.ok) continue;
                const data = await apiRes.json() as any;
                
                if (data.success && Array.isArray(data.streams)) {
                    for (const stream of data.streams) {
                        let rawUrl = stream.url || stream.proxyUrl || '';
                        
                        if (rawUrl.includes('hls?url=') || rawUrl.includes('mp4?url=')) {
                            const matchUrl = rawUrl.match(/(?:hls|mp4)\?url=(.+?)(?:&|$)/);
                            if (matchUrl?.[1]) {
                                rawUrl = decodeURIComponent(matchUrl[1]);
                            }
                        }
                        
                        if (!rawUrl.startsWith('http')) {
                            rawUrl = `${this.BASE_URL}/${rawUrl.replace(/^\//, '')}`;
                        }
                        
                        const isM3U8 = rawUrl.includes('.m3u8');
                        sources.push({
                            url: rawUrl,
                            type: isM3U8 ? 'hls' : 'mp4',
                            quality: typeof data.quality === 'string' ? data.quality : 'default',
                            audioTracks: [],
                            provider: {
                                name: `${this.name} ${sources.length + 1}`,
                                id: this.id
                            }
                        });
                    }
                }
            } catch (err) {
                // Ignore individual provider errors
            }
        }
        
        if (sources.length === 0) {
            throw new Error('No streams resolved from VidRift API');
        }
        
        return {
            sources,
            subtitles: [],
            diagnostics
        };
    }
}
