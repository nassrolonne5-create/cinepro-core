import { BaseProvider } from '@omss/framework';
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult, Source } from '@omss/framework';

export class VidfastProvider extends BaseProvider {
    readonly id = 'vidfast';
    readonly name = 'Vidfast';
    readonly enabled = true;
    readonly BASE_URL = 'https://vidfast.vc';
    readonly ENC_API = 'https://enc-dec.app/api';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: `https://vidfast.vc/`,
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
            const embedUrl = media.type === "tv"
                ? `${this.BASE_URL}/tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}/`
                : `${this.BASE_URL}/movie/${media.tmdbId}/`;

            const pageRes = await fetch(embedUrl, {
                headers: { "User-Agent": this.HEADERS["User-Agent"] },
                signal: AbortSignal.timeout(25000),
            });

            if (!pageRes.ok) {
                throw new Error(`Failed to fetch Vidfast page: ${pageRes.status}`);
            }

            const html = await pageRes.text();
            const match = html.match(/\\"(?:en|token)\\":\\"(.*?)\\"/) || html.match(/"(?:en|token)":"(.*?)"/);
            if (!match?.[1]) {
                throw new Error("Failed to parse encryption token from Vidfast page");
            }

            const encRes = await fetch(`${this.ENC_API}/enc-vidfast?text=${encodeURIComponent(match[1])}`, {
                signal: AbortSignal.timeout(25000),
            });
            if (!encRes.ok) {
                throw new Error(`Failed to encrypt token via API: ${encRes.status}`);
            }

            const encData = await encRes.json() as any;
            if (encData.status !== 200 || !encData.result) {
                throw new Error("Invalid response from Vidfast enc API");
            }

            const { servers: serversUrl, stream: streamUrl, token } = encData.result;
            const reqHeaders = { ...this.HEADERS, "X-CSRF-Token": token };

            const serversRes = await fetch(serversUrl, {
                method: "POST",
                headers: reqHeaders,
                signal: AbortSignal.timeout(25000),
            });

            if (!serversRes.ok) {
                throw new Error(`Failed to fetch servers list: ${serversRes.status}`);
            }

            const serversEncrypted = await serversRes.text();
            const decServersRes = await fetch(`${this.ENC_API}/dec-vidfast`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: serversEncrypted }),
                signal: AbortSignal.timeout(25000),
            });

            if (!decServersRes.ok) {
                throw new Error(`Failed to decrypt servers: ${decServersRes.status}`);
            }

            const decServersData = await decServersRes.json() as any;
            if (decServersData.status !== 200 || !Array.isArray(decServersData.result)) {
                throw new Error("Invalid server list after decryption");
            }

            const servers = decServersData.result;
            const streamHeaders = { ...this.HEADERS, Origin: this.BASE_URL };
            const sources: Source[] = [];

            const settled = await Promise.allSettled(servers.map(async (srv: any) => {
                const streamRes = await fetch(`${streamUrl}/${srv.data}`, {
                    method: "POST",
                    headers: reqHeaders,
                    signal: AbortSignal.timeout(25000),
                });
                if (!streamRes.ok) return null;

                const streamEncrypted = await streamRes.text();
                const decStreamRes = await fetch(`${this.ENC_API}/dec-vidfast`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: streamEncrypted }),
                    signal: AbortSignal.timeout(25000),
                });
                if (!decStreamRes.ok) return null;

                const decStreamData = await decStreamRes.json() as any;
                if (decStreamData.status !== 200 || !decStreamData.result?.url) return null;

                const rawUrl = decStreamData.result.url;
                const cleanUrl = this.unwrapUrl(rawUrl);
                const isM3U8 = cleanUrl.includes(".m3u8");

                const source: Source = {
                    url: this.createProxyUrl(cleanUrl, streamHeaders),
                    quality: "default",
                    type: isM3U8 ? "hls" : "mp4",
                    audioTracks: [],
                    provider: {
                        name: this.name,
                        id: this.id
                    }
                };
                return source;
            }));

            for (const r of settled) {
                if (r.status === "fulfilled" && r.value) {
                    sources.push(r.value);
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
