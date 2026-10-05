import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source,
    Subtitle
} from '@omss/framework';

export class VidLinkProvider extends BaseProvider {
    readonly id = 'vidlink';
    readonly name = 'VidLink';
    readonly enabled = true;
    readonly BASE_URL = 'https://vidlink.pro';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Origin': 'https://vidlink.pro',
        'Referer': 'https://vidlink.pro/'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            // 1. Get encryption token from enc-dec.app API
            const encRes = await fetch(`https://enc-dec.app/api/enc-vidlink?text=${encodeURIComponent(media.tmdbId)}`, {
                signal: AbortSignal.timeout(8000)
            });
            if (!encRes.ok) return { sources: [], subtitles: [], diagnostics: [] };
            
            const encData = await encRes.json() as any;
            if (encData.status !== 200 || !encData.result) {
                return { sources: [], subtitles: [], diagnostics: [] };
            }

            // 2. Fetch stream from VidLink API
            const endpoint = media.type === 'tv'
                ? `${this.BASE_URL}/api/b/tv/${encData.result}/${media.s || 1}/${media.e || 1}`
                : `${this.BASE_URL}/api/b/movie/${encData.result}`;

            const res = await fetch(endpoint, {
                headers: this.HEADERS,
                signal: AbortSignal.timeout(10000)
            });
            if (!res.ok) return { sources: [], subtitles: [], diagnostics: [] };

            const data = await res.json() as any;
            const sources: Source[] = [];
            const subtitles: Subtitle[] = [];

            if (data?.stream?.qualities) {
                const qualities = data.stream.qualities;
                for (const q of Object.keys(qualities)) {
                    const item = qualities[q];
                    if (item?.url) {
                        sources.push({
                            url: item.url,
                            quality: `${q}p`,
                            type: 'mp4',
                            audioTracks: [{ language: 'en', label: 'English' }],
                            provider: {
                                name: this.name,
                                id: this.id
                            }
                        });
                    }
                }
            }

            if (Array.isArray(data?.stream?.captions)) {
                for (const cap of data.stream.captions) {
                    if (cap?.url) {
                        subtitles.push({
                            url: cap.url,
                            label: cap.language || 'English',
                            format: 'srt'
                        });
                    }
                }
            }

            return { sources, subtitles, diagnostics: [] };
        } catch (e) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
