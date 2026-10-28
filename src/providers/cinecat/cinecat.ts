import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult
} from '@omss/framework';
import {
    getMediaSeasonEpisode,
    resolveVidnestV2,
    resolveRiveStreamClean
} from '../../utils/vidnestV2.js';

export class CinecatProvider extends BaseProvider {
    readonly id = 'cinecat';
    readonly name = 'CineCat';
    readonly enabled = true;
    readonly BASE_URL = 'https://beta.cinecat.eu';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://beta.cinecat.eu/',
        'Origin': 'https://beta.cinecat.eu'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6500)
            )
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6500)
            )
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        getMediaSeasonEpisode(media);

        // 1. Clean unwrapped RiveStream (Mirage 4K, Zephyr 4K, PrimeVids, Citadel)
        const riveSources = await resolveRiveStreamClean(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            3500
        );
        if (riveSources.length > 0) {
            return { sources: riveSources, subtitles: [], diagnostics: [] };
        }

        // 2. Fallback: VidNest v2
        const v2 = await resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'Zephyr 4K', path: 'flixhq' },
                { name: 'Prime Cloud', path: 'nextgencloudfabric' }
            ],
            3200
        );
        return { sources: v2.sources, subtitles: v2.subtitles, diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
