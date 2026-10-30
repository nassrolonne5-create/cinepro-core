import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { vidrock } from 'kaizoku-core';
import {
    getMediaSeasonEpisode,
    isCleanEnglishStream,
    resolveVidnestV2,
    mergeProviderSources
} from '../../utils/vidnestV2.js';

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
        const { season, episode } = getMediaSeasonEpisode(media);
        const timeout = (ms: number) => new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));

        const nativeTask = (async () => {
            const sources: Source[] = [];
            try {
                const data: any = await Promise.race([
                    vidrock.fetchSources(media.tmdbId, media.type, season, episode),
                    timeout(3000)
                ]);
                const headers = data?.headers || {};

                for (const src of (data?.sources || [])) {
                    if (!src?.url || !isCleanEnglishStream(src.url, src.server, src.quality)) continue;
                    const srvName = src.server || 'Orion';
                    const srvId = `${this.id}-${srvName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                    const url = Object.keys(headers).length > 0 ? this.createProxyUrl(src.url, headers) : src.url;
                    sources.push({
                        url,
                        quality: src.quality || '1080p',
                        type: src.isM3U8 || src.url.includes('.m3u8') ? 'hls' : 'mp4',
                        server: srvName,
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: `${this.name} (${srvName})`,
                            id: srvId
                        }
                    } as Source);
                }
            } catch {}
            return sources;
        })();

        const v2Task = resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'Atlas HD', path: 'flixhq' },
                { name: 'Orion Cloud', path: 'nextgencloudfabric' }
            ],
            2800
        ).catch(() => ({ sources: [] as Source[], subtitles: [] }));

        const [nativeSources, v2] = await Promise.all([nativeTask, v2Task]);
        const merged = mergeProviderSources(nativeSources, v2.sources);

        return { sources: merged, subtitles: v2.subtitles, diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
