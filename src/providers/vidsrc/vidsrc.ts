import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { getSourceType } from '../../utils/streamType.js';

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

export class VidSrcProvider extends BaseProvider {
    readonly id = 'vidsrc';
    readonly name = 'VidSrc';
    readonly enabled = true;
    readonly BASE_URL = 'https://vidsrc.me';
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
        const segment = media.type === 'tv'
            ? `tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}`
            : `movie/${media.tmdbId}`;

        const backends = [
            { name: 'HollyMovieHD', path: 'hollymoviehd' },
            { name: 'KlikXXI', path: 'klikxxi' }
        ];

        const sources: Source[] = [];

        await Promise.allSettled(backends.map(async (b) => {
            try {
                const res = await fetch(`https://new.vidnest.fun/${b.path}/${segment}`, {
                    headers: this.HEADERS,
                    signal: AbortSignal.timeout(8000)
                });
                if (!res.ok) return;

                const json = await res.json() as any;
                if (!json?.data) return;

                const raw = json.encrypted ? decodeVidnestBase64(json.data) : json.data;
                const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

                // Handle streams array
                if (Array.isArray(data.streams)) {
                    for (const s of data.streams) {
                        if (s?.url) {
                            const uLower = s.url.toLowerCase();
                            if (uLower.includes('tiktoks') || uLower.includes('animanga') || uLower.includes('aoneroom') || uLower.includes('boomchick')) continue;
                            sources.push({
                                url: s.url,
                                quality: s.language || s.quality || 'Auto',
                                type: getSourceType(s.url, s.type === 'hls' || s.url.includes('.m3u8')),
                                audioTracks: [{ language: 'en', label: 'English' }],
                                provider: {
                                    name: this.name,
                                    id: this.id
                                }
                            });
                        }
                    }
                }

                // Handle sources array
                if (Array.isArray(data.sources)) {
                    for (const s of data.sources) {
                        if (s?.url) {
                            const uLower = s.url.toLowerCase();
                            if (uLower.includes('tiktoks') || uLower.includes('animanga') || uLower.includes('aoneroom') || uLower.includes('boomchick')) continue;
                            sources.push({
                                url: s.url,
                                quality: s.quality || 'Auto',
                                type: getSourceType(s.url, s.url.includes('.m3u8')),
                                audioTracks: [{ language: 'en', label: 'English' }],
                                provider: {
                                    name: this.name,
                                    id: this.id
                                }
                            });
                        }
                    }
                }
            } catch {}
        }));

        return { sources, subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
