import crypto from 'node:crypto';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';

const HMAC_SECRET = 'a2cfc9eaa2a3690b5d4f6b5f958dbdeae52a097283d375bd253ee7c7062524f5';
const XOR_KEY = 'f16a6b92fcd6eed3e9476297f893f2505c32f79bc6efef9b6c95496aa5914548';
const BASE_URL = 'https://cinema.army';

function generateStreamToken(tmdbId: string | number): string {
    const message = `${tmdbId}:${Math.floor(Date.now() / 1000 / 60)}`;
    return crypto.createHmac('sha256', HMAC_SECRET).update(message).digest('hex');
}

function decodeStreamUrl(enc: string): string {
    if (!enc || enc.startsWith('http://') || enc.startsWith('https://')) return enc;
    try {
        const raw = Buffer.from(enc, 'base64').toString('binary');
        let out = '';
        for (let i = 0; i < raw.length; i++) {
            out += String.fromCharCode(raw.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % 64));
        }
        return out;
    } catch {
        return enc;
    }
}

export class CinemaArmyProvider extends BaseProvider {
    readonly id = 'cinemaarmy';
    readonly name = 'CinemaArmy';
    readonly enabled = true;
    readonly BASE_URL = BASE_URL;
    readonly HEADERS = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Origin': BASE_URL
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const sources: Source[] = [];
        try {
            const tmdbId = media.tmdbId;
            const token = generateStreamToken(tmdbId);
            const isTv = media.type === 'tv';
            const season = media.s || 1;
            const episode = media.e || 1;

            const targets = isTv ? [
                { name: 'Baker', method: 'POST', endpoint: `/cookiebakers/tv/${tmdbId}/${season}/${episode}` },
                { name: 'TCloud', method: 'GET', endpoint: `/tcloud/tv/${tmdbId}/${season}/${episode}` },
                { name: 'IPCloud', method: 'GET', endpoint: `/ipcloud/tv/${tmdbId}/${season}/${episode}` },
                { name: 'DCloud', method: 'GET', endpoint: `/dcloud/tv/${tmdbId}/${season}/${episode}` }
            ] : [
                { name: 'Baker', method: 'POST', endpoint: `/cookiebakers/movie/${tmdbId}` },
                { name: 'TCloud', method: 'GET', endpoint: `/tcloud/movie/${tmdbId}` },
                { name: 'IPCloud', method: 'GET', endpoint: `/ipcloud/movie/${tmdbId}` },
                { name: 'DCloud', method: 'GET', endpoint: `/dcloud/movie/${tmdbId}` }
            ];

            const referer = isTv
                ? `${BASE_URL}/watch?id=${tmdbId}&type=tv&season=${season}&episode=${episode}`
                : `${BASE_URL}/watch?id=${tmdbId}&type=movie`;

            const promises = targets.map(async (t) => {
                try {
                    const res = await fetch(`${BASE_URL}/api${t.endpoint}`, {
                        method: t.method,
                        headers: {
                            ...this.HEADERS,
                            'X-Stream-Token': token,
                            'Referer': referer
                        },
                        signal: AbortSignal.timeout(5000)
                    });
                    if (!res.ok) return null;
                    const json = (await res.json()) as any;
                    const rawUrl = json?.stream?.url;
                    if (!rawUrl) return null;

                    const decodedUrl = decodeStreamUrl(rawUrl);
                    if (!decodedUrl || !decodedUrl.startsWith('http')) return null;

                    const srcObj: any = {
                        url: decodedUrl,
                        quality: '1080p',
                        type: 'hls',
                        server: t.name,
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: `${this.name} (${t.name})`,
                            id: this.id
                        }
                    };
                    return srcObj as Source;
                } catch {
                    return null;
                }
            });

            const settled = await Promise.allSettled(promises);
            for (const item of settled) {
                if (item.status === 'fulfilled' && item.value) {
                    sources.push(item.value);
                }
            }

            return { sources, subtitles: [], diagnostics: [] };
        } catch {
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
