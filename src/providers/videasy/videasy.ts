import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';

const VIDNEST_ALPHABET = 'RB0fpH8ZEyVLkv7c2i6MAJ5u3IKFDxlS1NTsnGaqmXYdUrtzjwObCgQP94hoeW+/=';
const MAP: Record<string, number> = {};
for (let i = 0; i < VIDNEST_ALPHABET.length; i++) MAP[VIDNEST_ALPHABET[i]] = i;

function decodeVidnestBase64(input: string): string {
    let padded = input;
    const mod = padded.length % 4;
    if (mod !== 0) padded += '='.repeat(4 - mod);
    const bytes: number[] = [];
    for (let i = 0; i < padded.length; i += 4) {
        const chunk = padded.slice(i, i + 4);
        const c0 = MAP[chunk[0]] ?? 64;
        const c1 = MAP[chunk[1]] ?? 64;
        const c2 = chunk[2] === '=' ? 64 : (MAP[chunk[2]] ?? 64);
        const c3 = chunk[3] === '=' ? 64 : (MAP[chunk[3]] ?? 64);
        bytes.push(((c0 << 2) | (c1 >> 4)) & 0xff);
        if (c2 !== 64) bytes.push((((c1 & 0x0f) << 4) | (c2 >> 2)) & 0xff);
        if (c3 !== 64) bytes.push((((c2 & 0x03) << 6) | c3) & 0xff);
    }
    return Buffer.from(bytes).toString('utf8');
}

export class VideasyProvider extends BaseProvider {
    readonly id = 'videasy';
    readonly name = 'Videasy';
    readonly enabled = true;
    readonly BASE_URL = 'https://player.videasy.to';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Origin': 'https://vidnest.fun',
        'Referer': 'https://vidnest.fun/'
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
        try {
            const endpoint = media.type === 'tv'
                ? `https://new.vidnest.fun/videasy/tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}`
                : `https://new.vidnest.fun/videasy/movie/${media.tmdbId}`;

            const res = await fetch(endpoint, {
                headers: this.HEADERS,
                signal: AbortSignal.timeout(10000)
            });
            if (!res.ok) return { sources: [], subtitles: [], diagnostics: [] };

            const json = await res.json() as any;
            if (!json?.data) return { sources: [], subtitles: [], diagnostics: [] };

            const raw = json.encrypted ? decodeVidnestBase64(json.data) : json.data;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

            const streamUrl = parsed?.url || parsed?.stream || parsed?.playlist;
            if (!streamUrl || typeof streamUrl !== 'string') {
                return { sources: [], subtitles: [], diagnostics: [] };
            }

            const sources: Source[] = [{
                url: streamUrl,
                quality: 'Auto',
                type: 'hls',
                audioTracks: [{ language: 'en', label: 'English' }],
                provider: {
                    name: this.name,
                    id: this.id
                }
            }];

            return { sources, subtitles: [], diagnostics: [] };
        } catch (e) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
