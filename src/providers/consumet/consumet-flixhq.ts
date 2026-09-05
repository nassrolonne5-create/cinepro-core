import { BaseProvider } from '@omss/framework';
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult, Source } from '@omss/framework';
import { MOVIES } from '@consumet/extensions';
import { getSourceType } from '../../utils/streamType.js';

export class ConsumetFlixHQProvider extends BaseProvider {
    readonly id = 'consumet-flixhq';
    readonly name = 'consumet-flixhq';
    readonly enabled = false;
    readonly BASE_URL = 'https://flixhq.to';
    readonly HEADERS = {};
    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    private flixhq = new MOVIES.FlixHQ();

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
            // 1. Search for the title
            const searchTitle = media.title || "";
            const res = await this.flixhq.search(searchTitle);
            
            // 2. Find the exact match (or closest)
            let match = res.results.find((r: any) => 
                r.title.toLowerCase() === searchTitle.toLowerCase() &&
                (media.type === 'movie' ? r.type === 'Movie' : r.type === 'TV Series')
            );
            if (!match) {
                match = res.results[0]; // fallback to first result
            }

            if (!match) {
                return { sources: [], subtitles: [], diagnostics: [{ code: 'PROVIDER_ERROR', field: 'search', message: 'No match found on FlixHQ', severity: 'warning' }] };
            }

            // 3. Fetch Info
            const info = await this.flixhq.fetchMediaInfo(match.id);
            if (!info.episodes || info.episodes.length === 0) {
                 return { sources: [], subtitles: [], diagnostics: [{ code: 'PROVIDER_ERROR', field: 'episodes', message: 'No episodes found', severity: 'warning' }] };
            }
            
            // 4. Find the correct episode ID
            let episodeId = "";
            if (media.type === 'movie') {
                episodeId = info.episodes[0].id;
            } else {
                const ep = info.episodes.find((e: any) => 
                    e.season === media.s && e.number === media.e
                );
                if (ep) episodeId = ep.id;
                else episodeId = info.episodes[0].id; // Fallback
            }

            // 5. Fetch Sources
            const streamRes = await this.flixhq.fetchEpisodeSources(episodeId, match.id);
            
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
