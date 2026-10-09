import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';

export class LmscriptProvider extends BaseProvider {
    readonly id = 'lmscript';
    readonly name = 'LMScript';
    readonly enabled = true;
    readonly BASE_URL = 'https://lmscript.xyz';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    };
    
    // LMScript only supports movies
    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return { sources: [], subtitles: [], diagnostics: [] };
    }
    
    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        if (media.type === 'tv') return { sources: [], subtitles: [], diagnostics: [] };
        try {
            const query = media.title || media.imdbId || media.tmdbId;
            if (!query) return { sources: [], subtitles: [], diagnostics: [] };

            const url = `${this.BASE_URL}/v1/movies?filters%5Bq%5D=${encodeURIComponent(query)}&expand=streams`;
            const res = await fetch(url, {
                headers: this.HEADERS,
                signal: AbortSignal.timeout(8000)
            });
            if (!res.ok) return { sources: [], subtitles: [], diagnostics: [] };

            const data = await res.json() as any;
            if (!data?.items || !Array.isArray(data.items)) {
                return { sources: [], subtitles: [], diagnostics: [] };
            }

            const movie = data.items.find((item: any) =>
                String(item.tmdb_prefix) === String(media.tmdbId) ||
                String(item.tmdb_id) === String(media.tmdbId) ||
                (media.imdbId && item.imdb_id && String(item.imdb_id).includes(media.imdbId.replace(/\D/g, ''))) ||
                (media.title && item.title && item.title.toLowerCase() === media.title.toLowerCase())
            );

            if (!movie || !movie.streams) {
                return { sources: [], subtitles: [], diagnostics: [] };
            }

            const streams = movie.streams;
            const sources: Source[] = [];
            const qualities = ['1080p', '720p', '480p', '360p'];

            // Probe the primary stream to ensure upstream hash signature is valid and returns an actual playlist
            const probeUrl = streams['1080p'] || streams['720p'] || streams['480p'] || streams['360p'];
            if (probeUrl && typeof probeUrl === 'string') {
                try {
                    const probeRes = await fetch(probeUrl, {
                        headers: this.HEADERS,
                        signal: AbortSignal.timeout(3000)
                    });
                    if (!probeRes.ok) {
                        return { sources: [], subtitles: [], diagnostics: [] };
                    }
                    const sampleText = await probeRes.text();
                    if (!sampleText.includes('#EXTM3U') || sampleText.includes('WRONG HASH')) {
                        console.warn('[LMScript] Upstream stream invalid or rejected hash. Skipping LMScript.');
                        return { sources: [], subtitles: [], diagnostics: [] };
                    }
                } catch {
                    return { sources: [], subtitles: [], diagnostics: [] };
                }
            }

            for (const q of qualities) {
                const streamUrl = streams[q];
                if (streamUrl && typeof streamUrl === 'string') {
                    // Always proxy through CinePro proxy so requests come from the matching scraper IP
                    const proxiedUrl = this.createProxyUrl(streamUrl, this.HEADERS);
                    sources.push({
                        url: proxiedUrl,
                        quality: q,
                        type: streamUrl.includes('.m3u8') ? 'hls' : 'mp4',
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: this.name,
                            id: this.id
                        }
                    });
                }
            }

            return { sources, subtitles: [], diagnostics: [] };
        } catch (e) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
