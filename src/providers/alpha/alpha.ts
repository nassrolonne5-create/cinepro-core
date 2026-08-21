import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';

export class AlphaProvider extends BaseProvider {
    readonly id = 'alpha';
    readonly name = 'AlphaStream';
    readonly enabled = true;
    readonly BASE_URL = 'https://d2zihajmogu5jn.cloudfront.net';
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
                url: 'https://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8',
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
            const res = await fetch('https://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8', {
                method: 'HEAD'
            });
            return res.ok;
        } catch {
            return false;
        }
    }
}
