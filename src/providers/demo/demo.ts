import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';

export class DemoProvider extends BaseProvider {
    readonly id = 'demo';
    readonly name = 'DemoStream';
    readonly enabled = true;
    readonly BASE_URL = 'https://test-streams.mux.dev';
    readonly HEADERS = {};

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.getSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.getSources(media);
    }

    private async getSources(media: ProviderMediaObject): Promise<ProviderResult> {
        // We will return a public test HLS stream for demonstration purposes.
        const sources: Source[] = [
            {
                url: this.createProxyUrl('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', this.HEADERS),
                type: 'hls',
                quality: '1080p',
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
            const res = await fetch('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', {
                method: 'HEAD'
            });
            return res.ok;
        } catch {
            return false;
        }
    }
}
