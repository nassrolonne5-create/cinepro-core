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

export class ConsumetFlixHQProvider extends BaseProvider {
    readonly id = 'consumet-flixhq';
    readonly name = 'FlixHQ';
    readonly enabled = true;
    readonly BASE_URL = 'https://flixhq.to';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Referer': 'https://flixhq.to/'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['tv', 'movies']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.extractSources(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6500)
            )
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.extractSources(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6500)
            )
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    private async extractSources(media: ProviderMediaObject): Promise<ProviderResult> {
        getMediaSeasonEpisode(media);

        // 1. Direct FlixHQ v2 AES-GCM extractor (2160p 4K, 1080p, 720p, 480p + subtitles)
        const v2 = await resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'UpCloud', path: 'flixhq' },
                { name: 'VidCloud', path: 'nextgencloudfabric' }
            ],
            3500
        );
        if (v2.sources.length > 0) {
            return { sources: v2.sources, subtitles: v2.subtitles, diagnostics: [] };
        }

        // 2. Clean RiveStream fallback
        const riveSources = await resolveRiveStreamClean(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            3000
        );
        return { sources: riveSources, subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
