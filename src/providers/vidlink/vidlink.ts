import { getSourceType } from '../../utils/streamType.js';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source,
    Subtitle
} from '@omss/framework';
import {
    getMediaSeasonEpisode,
    resolveVidnestV2,
    resolveRiveStreamClean
} from '../../utils/vidnestV2.js';

export class VidlinkProvider extends BaseProvider {
    readonly id = 'vidlink';
    readonly name = 'VidLink';
    readonly enabled = true;
    readonly BASE_URL = 'https://vidlink.pro';
    readonly ENC_URL = 'https://enc-dec.app/api/enc-vidlink';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Referer': 'https://vidlink.pro/',
        'Origin': 'https://vidlink.pro'
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
        const { season, episode } = getMediaSeasonEpisode(media);
        const sources: Source[] = [];
        const subtitles: Subtitle[] = [];

        // 1. Primary native VidLink API (enc-vidlink -> vidlink.pro/api/b/)
        try {
            const encRes = await fetch(`${this.ENC_URL}?text=${media.tmdbId}`, {
                headers: this.HEADERS,
                signal: AbortSignal.timeout(3000)
            });
            if (encRes.ok) {
                const encData = (await encRes.json()) as any;
                const encId = encData?.result;
                if (encId) {
                    const endpoint = media.type === 'tv'
                        ? `${this.BASE_URL}/api/b/tv/${encId}/${season}/${episode}`
                        : `${this.BASE_URL}/api/b/movie/${encId}`;

                    const streamRes = await fetch(endpoint, {
                        headers: this.HEADERS,
                        signal: AbortSignal.timeout(3500)
                    });
                    if (streamRes.ok) {
                        const data = (await streamRes.json()) as any;
                        if (data?.stream?.qualities && typeof data.stream.qualities === 'object') {
                            for (const [q, details] of Object.entries(data.stream.qualities) as [string, any][]) {
                                if (details?.url) {
                                    const qLabel = q.includes('p') ? q : `${q}p`;
                                    sources.push({
                                        url: details.url,
                                        quality: qLabel,
                                        type: getSourceType(details.url, details.type === 'hls' || details.url.includes('.m3u8')),
                                        server: `Direct ${qLabel}`,
                                        audioTracks: [{ language: 'en', label: 'English' }],
                                        provider: {
                                            name: `${this.name} (${qLabel})`,
                                            id: `${this.id}-${qLabel.toLowerCase()}`
                                        }
                                    });
                                }
                            }
                        }

                        if (data?.stream?.playlist && typeof data.stream.playlist === 'string') {
                            const plUrl = data.stream.playlist;
                            const proxied = this.createProxyUrl(plUrl, this.HEADERS);
                            sources.push({
                                url: proxied,
                                quality: '1080p',
                                type: 'hls',
                                server: 'HLS Master',
                                audioTracks: [{ language: 'en', label: 'English' }],
                                provider: {
                                    name: `${this.name} (HLS Master)`,
                                    id: `${this.id}-hls`
                                }
                            });
                        }

                        if (Array.isArray(data?.stream?.captions)) {
                            for (const sub of data.stream.captions) {
                                if (sub?.url) {
                                    subtitles.push({
                                        url: sub.url,
                                        language: (sub.language || 'en').slice(0, 2).toLowerCase(),
                                        label: sub.language || 'English',
                                        format: sub.type === 'srt' || sub.url.endsWith('.srt') ? 'srt' : 'vtt'
                                    } as Subtitle);
                                }
                            }
                        }
                    }
                }
            }
        } catch {}

        // 2. Also resolve VidNest v2 (Hexa HD & Zeta Cloud) and RiveStream in parallel to maximize server count
        const [v2, riveSources] = await Promise.all([
            resolveVidnestV2(
                media,
                this.id,
                this.name,
                (u, h) => this.createProxyUrl(u, h),
                [
                    { name: 'Hexa HD', path: 'flixhq' },
                    { name: 'Zeta Cloud', path: 'nextgencloudfabric' }
                ],
                2800
            ).catch(() => ({ sources: [] as Source[], subtitles: [] as Subtitle[] })),
            resolveRiveStreamClean(
                media,
                this.id,
                this.name,
                (u, h) => this.createProxyUrl(u, h),
                2800
            ).catch(() => [] as Source[])
        ]);

        const merged = [...sources];
        const seen = new Set(sources.map(s => `${s.server || ''}::${s.quality || ''}::${s.url}`));
        for (const s of [...v2.sources, ...riveSources]) {
            const key = `${s.server || ''}::${s.quality || ''}::${s.url}`;
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(s);
            }
        }

        return {
            sources: merged,
            subtitles: subtitles.length > 0 ? subtitles : v2.subtitles,
            diagnostics: []
        };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
