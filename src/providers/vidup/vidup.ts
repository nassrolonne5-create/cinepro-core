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
    resolveRiveStreamClean
} from '../../utils/vidnestV2.js';

export class VidupProvider extends BaseProvider {
    readonly id = 'vidup';
    readonly name = 'VidUp';
    readonly enabled = true;
    readonly BASE_URL = 'https://vidup.to';
    readonly HEADERS = {};

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 7500)
            )
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 7500)
            )
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        getMediaSeasonEpisode(media);

        // 1. Native VidUp 2-stage encryption (Euro, CineX, Zenith, Premier, Eclipse)
        const native = await resolveVidupNative(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            4200
        );
        if (native.sources.length > 0) {
            return { sources: native.sources, subtitles: native.subtitles, diagnostics: [] };
        }

        // 2. Fallback: VidNest v2
        const v2 = await resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'Euro HD', path: 'flixhq' },
                { name: 'Zenith Cloud', path: 'nextgencloudfabric' }
            ],
            3200
        );
        if (v2.sources.length > 0) {
            return { sources: v2.sources, subtitles: v2.subtitles, diagnostics: [] };
        }

        // 3. Fallback: Clean RiveStream
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
