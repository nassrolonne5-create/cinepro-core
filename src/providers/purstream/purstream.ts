import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult, Source } from '@omss/framework';
import { purstream } from 'kaizoku-core';
import { resolveVidnestV2, mergeProviderSources } from '../../utils/vidnestV2.js';

export class PurstreamProvider extends BaseProvider {
    readonly id = 'purstream';
    readonly name = 'PurStream';
    readonly enabled = true;
    readonly BASE_URL = 'https://purstream.fun';
    readonly HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
    readonly capabilities: ProviderCapabilities = { supportedContentTypes: ['movies', 'tv'] };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> { return this.fetchSources(media); }
    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> { return this.fetchSources(media); }
    
    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const season = Number((media as any).season || (media as any).s || 1);
        const episode = Number((media as any).episode || (media as any).e || 1);

        const nativeTask = (async () => {
            const sources: Source[] = [];
            try {
                const data = await Promise.race([
                    purstream.fetchSources(media.tmdbId, media.type, season, episode),
                    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
                ]);
                for (const src of (data?.sources || [])) {
                    if (!src?.url) continue;
                    const srvName = src.server || 'PurStream HD';
                    sources.push({
                        url: src.url,
                        quality: src.quality || '1080p',
                        type: getSourceType(src.url, src.isM3U8),
                        server: srvName,
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: `${this.name} (${srvName})`,
                            id: `${this.id}-${srvName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                        }
                    });
                }
            } catch {}
            return sources;
        })();

        const v2Task = resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'PurStream 4K', path: 'flixhq' },
                { name: 'PurStream Cloud', path: 'nextgencloudfabric' }
            ],
            2800
        ).catch(() => ({ sources: [] as Source[], subtitles: [] }));

        const [nativeSources, v2] = await Promise.all([nativeTask, v2Task]);
        const merged = mergeProviderSources(nativeSources, v2.sources);

        return { sources: merged, subtitles: v2.subtitles, diagnostics: [] };
    }
    async healthCheck(): Promise<boolean> { return true; }
}
