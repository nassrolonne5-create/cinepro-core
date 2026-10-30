import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult
} from '@omss/framework';
import {
    getMediaSeasonEpisode,
    resolveVidupNative,
    resolveVidnestV2,
    resolveRiveStreamClean,
    mergeProviderSources
} from '../../utils/vidnestV2.js';

export class MappleProvider extends BaseProvider {
    readonly id = 'mapple';
    readonly name = 'Mapple';
    readonly enabled = true;
    readonly BASE_URL = 'https://mapple.uk';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Referer': 'https://mapple.uk/'
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

        const [nativeSettled, v2Settled, riveSettled] = await Promise.allSettled([
            resolveVidupNative(
                media,
                this.id,
                this.name,
                (u, h) => this.createProxyUrl(u, h),
                3200
            ),
            resolveVidnestV2(
                media,
                this.id,
                this.name,
                (u, h) => this.createProxyUrl(u, h),
                [
                    { name: 'Mapple 4K', path: 'flixhq' },
                    { name: 'Mapple Cloud', path: 'nextgencloudfabric' }
                ],
                3200
            ),
            resolveRiveStreamClean(
                media,
                this.id,
                this.name,
                (u, h) => this.createProxyUrl(u, h),
                3000
            )
        ]);

        const nativeSources = nativeSettled.status === 'fulfilled' ? nativeSettled.value.sources : [];
        const nativeSubs = nativeSettled.status === 'fulfilled' ? nativeSettled.value.subtitles : [];
        const v2Sources = v2Settled.status === 'fulfilled' ? v2Settled.value.sources : [];
        const v2Subs = v2Settled.status === 'fulfilled' ? v2Settled.value.subtitles : [];
        const riveSources = riveSettled.status === 'fulfilled' ? riveSettled.value : [];

        return {
            sources: mergeProviderSources(nativeSources, v2Sources, riveSources),
            subtitles: [...nativeSubs, ...v2Subs],
            diagnostics: []
        };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
