import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { purstream } from 'kaizoku-core';
import { getSourceType } from '../../utils/streamType.js';
import { getVidVaultToken } from '../../utils/vidvaultToken.js';
import {
    getMediaSeasonEpisode,
    resolveVidnestV2,
    resolveRiveStreamClean
} from '../../utils/vidnestV2.js';

export class VidVaultProvider extends BaseProvider {
    readonly id = 'vidvault';
    readonly name = 'VidVault';
    readonly enabled = true;
    readonly BASE_URL = 'https://vidvault.to';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Referer': 'https://vidvault.ru/',
        'Origin': 'https://vidvault.ru'
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

        const [purSettled, v2Settled, vaultSettled] = await Promise.allSettled([
            // 1. PurStream direct HLS master
            Promise.race([
                purstream.fetchSources(media.tmdbId, media.type, season, episode),
                new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
            ]),

            // 2. VidNest v2 (Vault HD + Vault Cloud)
            resolveVidnestV2(
                media,
                this.id,
                this.name,
                (u, h) => this.createProxyUrl(u, h),
                [
                    { name: 'Vault HD', path: 'flixhq' },
                    { name: 'Vault Cloud', path: 'nextgencloudfabric' }
                ],
                3200
            ),

            // 3. Native VidVault download-proxy (fast 2200ms ceiling so it never blocks)
            (async () => {
                const token = await getVidVaultToken();
                if (!token) return [];
                const bodyPayload = media.type === 'tv'
                    ? { type: 'tv', tmdbId: Number(media.tmdbId), season, episode }
                    : { type: 'movie', tmdbId: Number(media.tmdbId) };

                const res = await fetch(`${this.BASE_URL}/api/download-proxy`, {
                    method: 'POST',
                    headers: {
                        ...this.HEADERS,
                        'Content-Type': 'application/json',
                        'x-request-token': token
                    },
                    body: JSON.stringify(bodyPayload),
                    signal: AbortSignal.timeout(2200)
                });
                if (!res.ok) return [];
                const data = (await res.json()) as any;
                const list: Source[] = [];
                const rawUrl = data?.mkvV2Data?.url || data?.mkvData?.url;
                if (rawUrl) {
                    const proxied = this.createProxyUrl(rawUrl, this.HEADERS);
                    list.push({
                        url: proxied,
                        quality: '1080p',
                        type: 'mp4',
                        server: 'Master HD',
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: `${this.name} (Master HD)`,
                            id: `${this.id}-masterhd`
                        }
                    });
                }
                return list;
            })()
        ]);

        if (purSettled.status === 'fulfilled' && Array.isArray((purSettled.value as any)?.sources)) {
            for (const src of (purSettled.value as any).sources) {
                if (!src?.url) continue;
                sources.push({
                    url: src.url,
                    quality: src.quality || '1080p',
                    type: getSourceType(src.url, src.isM3U8),
                    server: 'Direct HLS',
                    audioTracks: [{ language: 'en', label: 'English' }],
                    provider: {
                        name: `${this.name} (Direct HLS)`,
                        id: `${this.id}-directhls`
                    }
                });
            }
        }

        if (v2Settled.status === 'fulfilled' && v2Settled.value.sources.length > 0) {
            sources.push(...v2Settled.value.sources);
        }

        if (vaultSettled.status === 'fulfilled' && Array.isArray(vaultSettled.value)) {
            sources.push(...vaultSettled.value);
        }

        if (sources.length > 0) {
            const subtitles = v2Settled.status === 'fulfilled' ? v2Settled.value.subtitles : [];
            return { sources, subtitles, diagnostics: [] };
        }

        // Fallback: Clean RiveStream
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
