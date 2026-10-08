import crypto from 'node:crypto';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source,
    Subtitle
} from '@omss/framework';
import { vidnest } from 'kaizoku-core';
import { getSourceType } from '../../utils/streamType.js';

export class IcefyProvider extends BaseProvider {
    readonly id = 'Icefy';
    readonly name = 'Icefy';
    readonly enabled = true;
    readonly BASE_URL = 'https://play.xpass.top';
    readonly EMBED_URL = 'https://embed.icefy.top';
    readonly DEFAULT_BUILD_ID = 'spv3-build-1787821613-50e5fc97c9dce367';
    readonly HEADERS: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Referer': 'https://embed.icefy.top/'
    };

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
        const sources: Source[] = [];
        const subtitles: Subtitle[] = [];

        // 1. Resolve via Icefy Player Engine (AES-256-GCM Decryption)
        try {
            const embedPath = media.type === 'tv'
                ? `/e/tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}?autostart=true`
                : `/e/movie/${media.tmdbId}?autostart=true`;

            const embedRes = await fetch(`${this.BASE_URL}${embedPath}`, {
                headers: {
                    'User-Agent': this.HEADERS['User-Agent'],
                    'Referer': `${this.EMBED_URL}/`
                },
                signal: AbortSignal.timeout(6000)
            });

            if (embedRes.ok) {
                const embedHtml = await embedRes.text();
                const dataUrlMatch = embedHtml.match(/var\s+dataUrl\s*=\s*"([^"]+)"/);

                if (dataUrlMatch && dataUrlMatch[1]) {
                    const dataUrl = dataUrlMatch[1];
                    const dataRes = await fetch(`${this.BASE_URL}${dataUrl}`, {
                        headers: {
                            'User-Agent': this.HEADERS['User-Agent'],
                            'Referer': `${this.BASE_URL}${embedPath}`
                        },
                        signal: AbortSignal.timeout(6000)
                    });

                    if (dataRes.ok) {
                        const encryptedText = (await dataRes.text()).trim();
                        const parsedDataUrl = new URL(dataUrl, 'https://data.invalid');
                        const pathname = parsedDataUrl.pathname;
                        const token = parsedDataUrl.searchParams.get('token');

                        if (token && encryptedText.length > 28) {
                            const hashInput = `spv3-data-response|${this.DEFAULT_BUILD_ID}|${pathname}|${token}`;
                            const keyHex = crypto.createHash('sha256').update(hashInput).digest('hex');
                            const key = Buffer.from(keyHex, 'hex');

                            let b64 = encryptedText.replace(/-/g, '+').replace(/_/g, '/');
                            while (b64.length % 4 !== 0) b64 += '=';
                            const rawBuffer = Buffer.from(b64, 'base64');

                            const iv = rawBuffer.subarray(0, 12);
                            const tag = rawBuffer.subarray(rawBuffer.length - 16);
                            const ciphertext = rawBuffer.subarray(12, rawBuffer.length - 16);

                            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
                            decipher.setAuthTag(tag);
                            const decryptedStr = decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
                            const serverList = JSON.parse(decryptedStr);

                            if (Array.isArray(serverList)) {
                                // Query the primary working streaming servers in parallel
                                const targetServers = serverList.filter((s: any) =>
                                    s?.url && (
                                        s.name?.includes('TIK') ||
                                        s.name?.includes('VIP') ||
                                        s.name?.includes('WIS') ||
                                        s.name?.includes('FIL') ||
                                        s.name?.includes('ARA')
                                    )
                                ).slice(0, 5);

                                const plPromises = targetServers.map(async (srv: any) => {
                                    try {
                                        const plRes = await fetch(`${this.BASE_URL}${srv.url}`, {
                                            headers: {
                                                'User-Agent': this.HEADERS['User-Agent'],
                                                'Referer': `${this.BASE_URL}${embedPath}`
                                            },
                                            signal: AbortSignal.timeout(4000)
                                        });
                                        if (!plRes.ok) return null;
                                        const plData = (await plRes.json()) as any;
                                        const file = plData?.playlist?.[0]?.sources?.[0]?.file || plData?.sources?.[0]?.file || plData?.file;
                                        if (file && typeof file === 'string') {
                                            return {
                                                serverName: srv.name || 'HD',
                                                file
                                            };
                                        }
                                    } catch {}
                                    return null;
                                });

                                const resolved = await Promise.allSettled(plPromises);
                                for (const r of resolved) {
                                    if (r.status === 'fulfilled' && r.value) {
                                        const { serverName, file } = r.value;
                                        const isM3U8 = file.includes('.m3u8');
                                        const streamHeaders = {
                                            'User-Agent': this.HEADERS['User-Agent'],
                                            'Referer': `${this.BASE_URL}/`
                                        };
                                        const proxiedUrl = this.createProxyUrl(file, streamHeaders);

                                        sources.push({
                                            url: proxiedUrl,
                                            quality: '1080p',
                                            type: getSourceType(file, isM3U8),
                                            audioTracks: [{ language: 'en', label: 'English' }],
                                            provider: {
                                                name: `${this.name} (${serverName})`,
                                                id: this.id
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }

                // Subtitles
                const subUrlMatch = embedHtml.match(/var\s+suburl\s*=\s*"([^"]+)"/);
                if (subUrlMatch && subUrlMatch[1]) {
                    try {
                        const subRes = await fetch(subUrlMatch[1], { signal: AbortSignal.timeout(3000) });
                        if (subRes.ok) {
                            const subJson = (await subRes.json()) as any[];
                            if (Array.isArray(subJson)) {
                                for (const sub of subJson) {
                                    if (sub?.url && sub?.language) {
                                        const fullSubUrl = sub.url.startsWith('http') ? sub.url : `https://sub.1x2.space${sub.url}`;
                                        subtitles.push({
                                            url: fullSubUrl,
                                            label: sub.label || sub.language || 'English',
                                            format: 'vtt'
                                        });
                                    }
                                }
                            }
                        }
                    } catch {}
                }
            }

            if (sources.length > 0) {
                return { sources, subtitles, diagnostics: [] };
            }
        } catch {}

        // 2. High-speed resilient fallback (VidNest)
        try {
            const data = await vidnest.fetchSources(media.tmdbId, media.type, media.s, media.e);
            if (data?.sources?.length) {
                const vidnestSources: Source[] = data.sources.map(src => {
                    const ext = src.isM3U8 || src.url.includes('.m3u8') ? '.m3u8' : '.mp4';
                    return {
                        url: src.url + (src.url.includes('?') ? '&' : '?') + 'provider=' + this.id + '&ext=' + ext,
                        quality: src.quality || 'auto',
                        type: getSourceType(src.url, src.isM3U8),
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: `${this.name} (Mirror)`,
                            id: this.id
                        }
                    };
                });
                return { sources: vidnestSources, subtitles, diagnostics: [] };
            }
        } catch {}

        return { sources: [], subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
