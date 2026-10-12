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
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) => setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6500))
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return Promise.race([
            this.fetchSources(media),
            new Promise<ProviderResult>((resolve) => setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 6500))
        ]).catch(() => ({ sources: [], subtitles: [], diagnostics: [] }));
    }
    
    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const segment = media.type === 'tv'
            ? `tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}`
            : `movie/${media.tmdbId}`;

        const backends = [
            { name: 'HollyMovieHD', path: 'hollymoviehd' },
            { name: 'MovieBox', path: 'moviebox' }
        ];

        const sources: Source[] = [];

        await Promise.allSettled(backends.map(async (b) => {
            try {
                const res = await fetch(`https://new.vidnest.fun/${b.path}/${segment}`, {
                    headers: this.HEADERS,
                    signal: AbortSignal.timeout(3000)
                });
                if (!res.ok) return;

                const json = await res.json() as any;
                if (!json?.data) return;

                const raw = json.encrypted ? decodeVidnestBase64(json.data) : json.data;
                const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

                if (Array.isArray(data.streams)) {
                    for (const s of data.streams) {
                        if (s?.url) {
                            const uLower = s.url.toLowerCase();
                            if (uLower.includes('tiktoks') || uLower.includes('animanga') || uLower.includes('aoneroom') || uLower.includes('boomchick')) continue;
                            sources.push({
                                url: s.url,
                                quality: s.language || s.quality || 'Auto',
                                type: getSourceType(s.url, s.type === 'hls' || s.url.includes('.m3u8')),
                                server: b.name,
                                audioTracks: [{ language: 'en', label: 'English' }],
                                provider: {
                                    name: `${this.name} (${b.name})`,
                                    id: `${this.id}-${b.path}`
                                }
                            });
                        }
                    }
                }
            } catch {}
        }));

        if (sources.length > 0) {
            return { sources, subtitles: [], diagnostics: [] };
        }

        // Fallback: RiveStream mirror
        try {
            const { rivestream } = await import('kaizoku-core');
            const data: any = await Promise.race([
                rivestream.fetchSources(media.tmdbId, media.type, media.s, media.e),
                new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
            ]);
            if (data?.sources?.length) {
                for (const src of data.sources) {
                    const uLower = (src.url || '').toLowerCase();
                    if (uLower.includes('boomchick') || uLower.includes('streamflix') || uLower.includes('aoneroom')) continue;
                    const sName = src.server ? `${src.server}` : 'Alpha';
                    sources.push({
                        url: src.url,
                        quality: src.quality || '1080p',
                        type: getSourceType(src.url, src.isM3U8),
                        server: sName,
                        audioTracks: [{ language: 'en', label: 'English' }],
                        provider: {
                            name: `${this.name} (${sName})`,
                            id: `${this.id}-${sName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                        }
                    });
                }
                if (sources.length > 0) return { sources, subtitles: [], diagnostics: [] };
            }
        } catch {}

        return { sources: [], subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
