import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidrock } from 'kaizoku-core';

export class VidrockProvider extends BaseProvider {
    readonly id = 'vidrock';
    readonly name = 'VidRock';
    readonly enabled = true;
    readonly BASE_URL = '';
    readonly HEADERS = {};
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
            const data = await vidrock.fetchSources(media.tmdbId, media.type, media.s, media.e);
            const headers = data.headers || {};
            const sources: Source[] = [];

            // Pre-validate streams concurrently with a fast ping to weed out 403 / bot-blocked CDN hosts (e.g. staticreverie)
            const validationPromises = (data.sources || []).map(async (src: any) => {
                let isAlive = true;
                try {
                    const ping = await fetch(src.url, {
                        method: 'GET',
                        headers: { ...headers, Range: 'bytes=0-50' },
                        signal: AbortSignal.timeout(2500)
                    });
                    if (ping.status >= 400) {
                        isAlive = false;
                    }
                } catch {
                    // In case of ping timeout, keep if no 4xx was explicitly returned
                }
                return { src, isAlive };
            });

            const checkedSources = await Promise.all(validationPromises);
            const liveSources = checkedSources.filter(s => s.isAlive).map(s => s.src);
            const finalCandidates = liveSources.length > 0 ? liveSources : (data.sources || []);

            for (const src of finalCandidates) {
                const url = Object.keys(headers).length > 0 ? this.createProxyUrl(src.url, headers) : src.url;
                sources.push({
                    url,
                    quality: src.quality || 'Auto',
                    type: src.isM3U8 || src.url.includes('.m3u8') ? 'hls' : 'mp4',
                    audioTracks: [{ language: 'en', label: 'English' }],
                    provider: {
                        name: src.server ? `${this.name} (${src.server})` : this.name,
                        id: this.id
                    }
                });
            }
            return { sources, subtitles: [], diagnostics: [] };
        } catch {
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
