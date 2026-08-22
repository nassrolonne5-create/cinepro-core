import { BaseProvider } from '@omss/framework';
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult, Source } from '@omss/framework';

export class VidcoreProvider extends BaseProvider {
    readonly id = 'vidcore';
    readonly name = 'Vidcore';
    readonly enabled = true;
    readonly BASE_URL = 'https://vidcore.io';
    readonly API_BASE = 'https://enc-dec.app/api';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        Referer: 'https://vidcore.io/',
        Origin: 'https://vidcore.io',
        'X-Requested-With': 'XMLHttpRequest',
    };
    
    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.extractSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.extractSources(media);
    }

    private unwrapUrl(url: string): string {
        return url.startsWith('//') ? 'https:' + url : url;
    }

    private async extractSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            const pageUrl = media.type === "movie"
                ? `${this.BASE_URL}/movie/${media.tmdbId}`
                : `${this.BASE_URL}/tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}`;

            const res = await fetch(pageUrl, {
                headers: this.HEADERS,
                signal: AbortSignal.timeout(25000),
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch VidCore page: ${res.status}`);
            }

            const html = await res.text();
            const primaryMatch = html.match(/\\"(?:en|token)\\":\\"(.*?)\\"/) || html.match(/\\"en\\":\\"(.*?)\\"/);
            const plainMatch = html.match(/"en"\s*:\s*"([A-Za-z0-9+/=._-]{16,})"/);
            const pageToken = primaryMatch?.[1] || plainMatch?.[1];

            if (!pageToken) {
                throw new Error("Could not extract page token from VidCore");
            }

            const encRes = await fetch(`${this.API_BASE}/enc-vidcore?text=${encodeURIComponent(pageToken)}`, {
                signal: AbortSignal.timeout(25000),
            });

            if (!encRes.ok) {
                throw new Error(`VidCore handshake request failed: ${encRes.status}`);
            }

            const encJson = await encRes.json() as any;
            if (encJson.status !== 200 || !encJson.result?.servers || !encJson.result?.stream) {
                throw new Error("VidCore handshake response invalid");
            }

            const handshake = encJson.result;
            const csrfToken = handshake.token || "";

            const serversPostRes = await fetch(handshake.servers, {
                method: "POST",
                headers: { ...this.HEADERS, "X-CSRF-Token": csrfToken },
                signal: AbortSignal.timeout(25000),
            });

            if (!serversPostRes.ok) {
                throw new Error(`VidCore fetch servers failed with status ${serversPostRes.status}`);
            }

            const serversEncrypted = await serversPostRes.text();
            const decServersRes = await fetch(`${this.API_BASE}/dec-vidcore`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: serversEncrypted }),
                signal: AbortSignal.timeout(25000),
            });

            if (!decServersRes.ok) {
                throw new Error(`VidCore decrypt servers failed with status ${decServersRes.status}`);
            }

            const decServersJson = await decServersRes.json() as any;
            if (decServersJson.status !== 200 || !decServersJson.result) {
                throw new Error("VidCore decrypted servers invalid");
            }

            const list = Array.isArray(decServersJson.result)
                ? decServersJson.result
                : Array.isArray(decServersJson.result?.servers)
                    ? decServersJson.result.servers
                    : [];
            const servers = list.filter((s: any) => !!s && typeof s === "object" && typeof s.data === "string");
            
            if (servers.length === 0) {
                throw new Error("No valid VidCore servers found");
            }

            const streamHeaders = { ...this.HEADERS, Origin: this.BASE_URL };
            const sources: Source[] = [];

            const settled = await Promise.allSettled(servers.map(async (server: any) => {
                const streamUrl = `${handshake.stream}/${server.data}`;
                const streamPostRes = await fetch(streamUrl, {
                    method: "POST",
                    headers: { ...this.HEADERS, "X-CSRF-Token": csrfToken },
                    signal: AbortSignal.timeout(25000),
                });
                if (!streamPostRes.ok) return [];

                const streamEncrypted = await streamPostRes.text();
                const decStreamRes = await fetch(`${this.API_BASE}/dec-vidcore`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: streamEncrypted }),
                    signal: AbortSignal.timeout(25000),
                });
                if (!decStreamRes.ok) return [];

                const decStreamJson = await decStreamRes.json() as any;
                if (decStreamJson.status !== 200 || !decStreamJson.result) return [];

                const payload = decStreamJson.result;
                const serverSources: Source[] = [];

                const pushSource = (rawUrl: string, typeHint: string, qualityHint: string) => {
                    if (!rawUrl || typeof rawUrl !== "string") return;
                    const cleanUrl = this.unwrapUrl(rawUrl);
                    const isM3U8 = cleanUrl.includes(".m3u8") || typeHint === "hls";
                    
                    serverSources.push({
                        url: this.createProxyUrl(cleanUrl, streamHeaders),
                        type: isM3U8 ? "hls" : "mp4",
                        quality: qualityHint || "Auto",
                        audioTracks: [],
                        provider: {
                            name: server.name || this.name,
                            id: this.id
                        }
                    });
                };

                pushSource(payload.url || payload.file, payload.type, payload.quality);

                if (Array.isArray(payload.sources)) {
                    for (const s of payload.sources) {
                        pushSource(s.url || s.file, s.type, s.quality || s.label);
                    }
                }
                
                if (payload.qualities && typeof payload.qualities === "object") {
                    for (const [q, entry] of Object.entries<any>(payload.qualities)) {
                        pushSource(entry?.url || entry?.file, entry?.type, q);
                    }
                }

                return serverSources;
            }));

            for (const r of settled) {
                if (r.status === "fulfilled" && r.value.length > 0) {
                    sources.push(...r.value);
                }
            }

            return { sources, subtitles: [], diagnostics: [] };
        } catch (e: any) {
            console.error(`[${this.name}] Error:`, e.message);
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
