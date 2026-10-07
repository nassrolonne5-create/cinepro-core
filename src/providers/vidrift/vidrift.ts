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

    readonly BASE_URL = 'https://embed.vidrift.net';
    readonly HEADERS = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://vidrift.net/',
        'Sec-Fetch-Dest': 'iframe',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            return await this.extractSources(media);
        } catch {
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            return await this.extractSources(media);
        } catch {
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    private async extractSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const endpoint = media.type === 'tv'
            ? `${this.BASE_URL}/embed/tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}`
            : `${this.BASE_URL}/embed/movie/${media.tmdbId}`;

        let pageRes: any;
        try {
            pageRes = await axios.get(endpoint, {
                headers: this.HEADERS,
                timeout: 6000,
                validateStatus: (status) => status < 400
            });
        } catch {
            return { sources: [], subtitles: [], diagnostics: [] };
        }

        if (!pageRes || pageRes.status !== 200 || !pageRes.data) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }
        const html = pageRes.data;

        let meta: any = null;
        const match = html.match(/var embedMeta = (\{.*?\});/s) || html.match(/embedMeta\s*=\s*(\{.+?\});\s*(?:const|let|var|<\/script>)/s);
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

        if (!meta) return { sources: [], subtitles: [], diagnostics: [] };

        const sources: Source[] = [];
        const seenUrls = new Set<string>();

        const addSource = (url: string, quality: string, serverName: string) => {
            if (!url || seenUrls.has(url)) return;
            seenUrls.add(url);

            let streamUrl = url;
            if (url.includes('relay.vidrift.net') || url.includes('remoteconsultinggroup.site') || url.includes('/api/proxy/hls')) {
                const requiredHeaders = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://embed.vidrift.net/',
                    'Origin': 'https://embed.vidrift.net'
                };
                const proxyData = JSON.stringify({ url, headers: requiredHeaders });
                streamUrl = `/v1/proxy?data=${encodeURIComponent(proxyData)}&provider=${this.id}&ext=.m3u8`;
            }

            sources.push({
                url: streamUrl,
                quality: quality || '1080p',
                type: getSourceType(url, true),
                audioTracks: [{ language: 'en', label: 'English' }],
                provider: {
                    name: `${this.name} (${serverName})`,
                    id: this.id
                }
            });
        };

        // 1. Pre-warmed master HLS streams from warmStreams
        if (Array.isArray(meta.warmStreams)) {
            for (const ws of meta.warmStreams) {
                const streamUrl = ws.proxyUrl || ws.url;
                if (streamUrl && typeof streamUrl === 'string' && streamUrl.startsWith('http')) {
                    addSource(streamUrl, ws.quality || '1080p', ws.provider || 'Earth');
                }
            }
        }

        // 2. Query provider APIs if playbackToken exists
        const token = meta.playbackToken;
        if (token) {
            const providers = ['vaplayer', 'zephyr', 'vidgod'];
            const typePath = media.type === 'tv'
                ? `tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}`
                : `movie/${media.tmdbId}`;

            await Promise.allSettled(providers.map(async (p) => {
                try {
                    const apiRes = await axios.get(`${this.BASE_URL}/api/source/${typePath}?token=${encodeURIComponent(token)}&provider=${p}`, {
                        headers: {
                            'User-Agent': this.HEADERS['User-Agent'],
                            'Referer': endpoint,
                            'Sec-Fetch-Dest': 'empty',
                            'Sec-Fetch-Mode': 'cors',
                            'Accept': 'application/json, text/plain, */*'
                        },
                        timeout: 5000
                    });

                    if (apiRes.status !== 200 || !apiRes.data?.success) return;
                    const data = apiRes.data as any;

                    if (Array.isArray(data.streams)) {
                        for (const stream of data.streams) {
                            let rawUrl = stream.proxyUrl || stream.url || '';
                            if (!rawUrl) continue;
                            if (rawUrl.startsWith('/')) {
                                rawUrl = `${this.BASE_URL}${rawUrl}`;
                            }
                            addSource(rawUrl, data.quality || stream.quality || '1080p', p === 'vaplayer' ? 'VAPlayer' : (p === 'zephyr' ? 'Zephyr' : p));
                        }
                    }
                } catch {}
            }));
        }

        return {
            sources,
            subtitles: [],
            diagnostics: []
        };
    }
}
