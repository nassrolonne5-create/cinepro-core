import { BaseProvider } from '@omss/framework';
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult, Source } from '@omss/framework';
import { MOVIES } from '@consumet/extensions';
import { getSourceType } from '../../utils/streamType.js';

export class ConsumetDramaCoolProvider extends BaseProvider {
    readonly id = 'consumet-dramacool';
    readonly name = 'DramaCool (Consumet)';
    readonly enabled = true;
    readonly BASE_URL = 'https://dramacool.bg';
    readonly HEADERS = {};
    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['tv', 'movies']
    };

    private drama = new MOVIES.DramaCool();

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.extractSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.extractSources(media);
    }

    private async extractSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const diagnostics: any[] = [];
        const sources: Source[] = [];
        try {
            const searchTitle = media.title || "";
            const res = await this.drama.search(searchTitle);
            
            let match = res.results.find((r: any) => 
                r.title.toLowerCase().includes(searchTitle.toLowerCase())
            );
            if (!match) match = res.results[0];

            if (!match) {
                return { sources: [], subtitles: [], diagnostics: [{ code: 'PROVIDER_ERROR', field: 'search', message: 'No match found on DramaCool', severity: 'warning' }] };
            }

            const info = await this.drama.fetchMediaInfo(match.id);
            if (!info.episodes || info.episodes.length === 0) {
                 return { sources: [], subtitles: [], diagnostics: [{ code: 'PROVIDER_ERROR', field: 'episodes', message: 'No episodes found', severity: 'warning' }] };
            }
            
            let epNumber = media.type === 'movie' ? 1 : media.e || 1;
            
            const ep = info.episodes.find((e: any) => 
                e.title.includes(`Episode ${epNumber}`) || e.episode === epNumber
            );
            const episodeId = ep ? ep.id : info.episodes[0].id;

            const streamRes = await this.drama.fetchEpisodeSources(episodeId, match.id as any);
            
            if (streamRes && streamRes.sources) {
                for (const src of streamRes.sources) {
                    sources.push({
                        url: src.url,
                        quality: src.quality || 'default',
                        type: getSourceType(src.url, src.isM3U8),
                        audioTracks: [],
                        provider: {
                            name: `${this.name} ${src.quality || ''}`.trim(),
                            id: this.id
                        }
                    });
                }
            }

            return { sources, subtitles: [], diagnostics };
        } catch (e: any) {
            diagnostics.push({ code: 'PROVIDER_ERROR', field: '', message: e.message, severity: 'error' });
            return { sources: [], subtitles: [], diagnostics };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
