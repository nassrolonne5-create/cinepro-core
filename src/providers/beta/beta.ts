import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';

export class BetaProvider extends BaseProvider {
    readonly id = 'beta';
    readonly name = 'BetaStream';
    readonly enabled = true;
    readonly BASE_URL = 'https://test-streams.mux.dev';
    readonly HEADERS = {};

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.getSources();
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.getSources();
    }

    private async getSources(): Promise<ProviderResult> {
        const sources: Source[] = [
            {
                url: this.createProxyUrl('https://test-streams.mux.dev/pts_shift/master.m3u8', this.HEADERS),
                type: 'hls',
                quality: '720p',
                audioTracks: [
                    {
                        language: 'eng',
                        label: 'English'
                    }
                ],
                provider: {
                    id: this.id,
                    name: this.name
                }
            }
        ];

        return {
            sources,
            subtitles: [],
            diagnostics: []
        };
    }

    async healthCheck(): Promise<boolean> {
        try {
            const res = await fetch('https://test-streams.mux.dev/pts_shift/master.m3u8', {
                method: 'HEAD'
            });
            return res.ok;
        } catch {
            return false;
        }
    }
}
