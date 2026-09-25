import axios from 'axios';
import { getSourceType } from '../../utils/streamType.js';
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

        const pageRes = await axios.get(endpoint, {
            headers: { ...this.HEADERS, Accept: 'text/html' },
            timeout: 5000
        });
        
        if (pageRes.status !== 200) throw new Error(`Failed to fetch page: ${pageRes.status}`);
        const html = pageRes.data;
        
        let meta: any = null;
        const match = html.match(/embedMeta\s*=\s*(\{.+?\});\s*(?:const|let|var|<\/script>)/s);
        if (match) {
            try { meta = JSON.parse(match[1]); } catch (e) {}
        }
        if (!meta) {
            const startIdx = html.indexOf('embedMeta = {');
            if (startIdx !== -1) {
                let depth = 0;
                let endIdx = -1;
                const str = html.slice(startIdx + 'embedMeta = '.length);
                for (let i = 0; i < str.length; i++) {
                    if (str[i] === '{') depth++;
                    else if (str[i] === '}') {
                        depth--;
                        if (depth === 0) {
                            endIdx = i + 1;
                            break;
                        }
                    }
                }
                if (endIdx !== -1) {
                    try { meta = JSON.parse(str.slice(0, endIdx)); } catch (e) {}
                }
            }
        }
        
        if (!meta) throw new Error("Failed to extract embedMeta");

        const sources: Source[] = [];
        const diagnostics: any[] = [];

        // 1. Add pre-warmed direct HLS streams from warmStreams
        if (Array.isArray(meta.warmStreams)) {
            for (const ws of meta.warmStreams) {
                const streamUrl = ws.proxyUrl || ws.url;
                if (streamUrl && typeof streamUrl === 'string' && streamUrl.startsWith('http')) {
                    sources.push({
                        url: streamUrl,
                        type: getSourceType(streamUrl, true),
                        quality: typeof ws.quality === 'string' ? ws.quality : '1080p',
                        audioTracks: [],
                        provider: {
                            name: `${this.name} (${ws.provider || 'Direct'})`,
                            id: this.id
                        }
                    });
                }
            }
        }

        // 2. Query provider APIs if token exists
        const token = meta.playbackToken;
        if (token) {
            const providers = ['vaplayer', 'selfhost', 'vidgod', 'turbo'];
            const typePath = media.type === 'tv'
                ? `tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}`
                : `movie/${media.tmdbId}`;
                
            await Promise.all(providers.map(async (p) => {
                try {
                    const apiRes = await axios.get(`${this.BASE_URL}/api/source/${typePath}?token=${encodeURIComponent(token)}&provider=${p}`, {
                        headers: {
                            ...this.HEADERS,
                            'Referer': endpoint
                        },
                        timeout: 4000
                    });
                    
                    if (apiRes.status !== 200) return;
                    const data = apiRes.data as any;
                    
                    if (data.success && Array.isArray(data.downloads)) {
                        for (const dl of data.downloads) {
                            let rawUrl = dl.url || dl.file || dl.link || '';
                            if (!rawUrl) continue;
                            if (!rawUrl.startsWith('http')) {
                                rawUrl = `${this.BASE_URL}/${rawUrl.replace(/^\//, '')}`;
                            }
                            sources.push({
                                url: rawUrl,
                                type: getSourceType(rawUrl, false),
                                quality: typeof dl.quality === 'string' ? dl.quality : 'default',
                                audioTracks: [],
                                provider: {
                                    name: this.name,
                                    id: this.id
                                }
                            });
                        }
                    }
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
                                type: getSourceType(rawUrl, isM3U8),
                                quality: typeof stream.quality === 'string' ? stream.quality : (typeof data.quality === 'string' ? data.quality : 'default'),
                                audioTracks: [],
                                provider: {
                                    name: this.name,
                                    id: this.id
                                }
                            });
                        }
                    }
                } catch (err) {
                    // Ignore individual provider errors
                }
            }));
        }
        
        return {
            sources,
            subtitles: [],
            diagnostics
        };
    }
}
