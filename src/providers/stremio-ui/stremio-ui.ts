import { BaseProvider } from '@omss/framework';
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult, Source } from '@omss/framework';

export class StremioUIProvider extends BaseProvider {
    readonly id = 'stremio-ui';
    readonly name = 'Stremio (Addons)';
    readonly enabled = false;
    readonly BASE_URL = 'https://stremio.com';
    readonly HEADERS = {};
    
    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return { sources: [], subtitles: [], diagnostics: [] };
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return { sources: [], subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
