import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Subtitle
} from '@omss/framework';
import { handleSubtitleMovie, handleSubtitleTv } from 'kaizoku-core';

export class SubtitlesProvider extends BaseProvider {
    readonly id = 'subtitles';
    readonly name = 'Subtitles';
    readonly enabled = true;
    readonly BASE_URL = 'https://sub.vdrk.site';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv', 'sub']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSubtitles(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSubtitles(media);
    }

    private async fetchSubtitles(media: ProviderMediaObject): Promise<ProviderResult> {
        const subtitles: Subtitle[] = [];
        try {
            let res: any;
            if (media.type === 'tv' && media.s && media.e) {
                res = await handleSubtitleTv(media.tmdbId, media.s, media.e, {});
            } else {
                res = await handleSubtitleMovie(media.tmdbId, {});
            }

            if (res && res.body) {
                const subs = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
                if (Array.isArray(subs)) {
                    const seen = new Set<string>();
                    for (const s of subs) {
                        if (!s.file || !s.label) continue;
                        // Filter out promo tags
                        if (s.label.toLowerCase().includes('kaizoku')) continue;
                        const key = `${s.label.toLowerCase()}_${s.type || 'vtt'}`;
                        if (seen.has(key)) continue;
                        seen.add(key);

                        subtitles.push({
                            url: s.file,
                            label: s.label,
                            format: (s.type === 'srt' ? 'srt' : 'vtt') as 'srt' | 'vtt'
                        });
                    }
                }
            }
        } catch (e: any) {
            // Graceful fallback if subtitle service is unreachable
        }

        return {
            sources: [],
            subtitles,
            diagnostics: []
        };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
