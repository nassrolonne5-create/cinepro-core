import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source,
    AudioTrack
} from '@omss/framework';
import * as cheerio from 'cheerio';
import { resolveVidnestV2, mergeProviderSources } from '../../utils/vidnestV2.js';

export class StreamXProvider extends BaseProvider {
    readonly id = 'streamx';
    readonly name = 'StreamX';
    readonly enabled = true;
    readonly BASE_URL = 'https://streamx.me';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Referer': 'https://streamx.me/'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const nativeTask = Promise.race([
            this.scrapeMovie(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 3500)
            )
        ]).catch(() => ({ sources: [] as Source[], subtitles: [], diagnostics: [] }));

        const v2Task = resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'StreamX 4K', path: 'flixhq' },
                { name: 'StreamX Cloud', path: 'nextgencloudfabric' }
            ],
            2800
        ).catch(() => ({ sources: [] as Source[], subtitles: [] }));

        const [nativeRes, v2] = await Promise.all([nativeTask, v2Task]);
        return {
            sources: mergeProviderSources(nativeRes.sources, v2.sources),
            subtitles: v2.subtitles,
            diagnostics: []
        };
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const nativeTask = Promise.race([
            this.scrapeTV(media),
            new Promise<ProviderResult>((resolve) =>
                setTimeout(() => resolve({ sources: [], subtitles: [], diagnostics: [] }), 3500)
            )
        ]).catch(() => ({ sources: [] as Source[], subtitles: [], diagnostics: [] }));

        const v2Task = resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'StreamX 4K', path: 'flixhq' },
                { name: 'StreamX Cloud', path: 'nextgencloudfabric' }
            ],
            2800
        ).catch(() => ({ sources: [] as Source[], subtitles: [] }));

        const [nativeRes, v2] = await Promise.all([nativeTask, v2Task]);
        return {
            sources: mergeProviderSources(nativeRes.sources, v2.sources),
            subtitles: v2.subtitles,
            diagnostics: []
        };
    }

    async healthCheck(): Promise<boolean> {
        try {
            const res = await fetch(this.BASE_URL, {
                method: 'HEAD',
                headers: this.HEADERS,
                signal: AbortSignal.timeout(3000)
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    private async resolveTitle(media: ProviderMediaObject): Promise<{ title: string; year?: number }> {
        let title = (media.title || '').trim();
        let year = Number(media.releaseYear || (media as any).year || 0) || undefined;

        if (!title && media.tmdbId) {
            try {
                const envKey = process.env.TMDB_API_KEY;
                const apiKey = (envKey && envKey !== 'fake_key' && envKey !== 'your_tmdb_api_key_here')
                    ? envKey
                    : '5201b54eb0968700e693a30576d7d4dc';
                const endpoint = media.type === 'movie' ? 'movie' : 'tv';
                const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${media.tmdbId}?api_key=${apiKey}`, {
                    signal: AbortSignal.timeout(2500)
                });
                if (res.ok) {
                    const data = (await res.json()) as any;
                    title = data.title || data.name || '';
                    const releaseDate = data.release_date || data.first_air_date || '';
                    if (releaseDate) {
                        year = parseInt(releaseDate.slice(0, 4), 10);
                    }
                }
            } catch {
                // Ignore TMDB fallback errors
            }
        }

        return { title, year };
    }

    private async scrapeMovie(media: ProviderMediaObject): Promise<ProviderResult> {
        const { title, year } = await this.resolveTitle(media);
        if (!title) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }

        const cleanTitle = title.replace(/[^\w\s-]/gi, ' ').replace(/\s+/g, ' ').trim();
        const searchUrl = `${this.BASE_URL}/?s=${encodeURIComponent(cleanTitle)}`;

        const searchRes = await fetch(searchUrl, {
            headers: this.HEADERS,
            signal: AbortSignal.timeout(3500)
        });

        if (!searchRes.ok) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }

        const searchHtml = await searchRes.text();
        const $ = cheerio.load(searchHtml);
        const candidates: Array<{ href: string; title: string; year?: number }> = [];

        $('li.TPostMv, li.xxx').each((_, el) => {
            const a = $(el).find('a[href*="/movie/"]').first();
            const href = a.attr('href');
            const itemTitle = $(el).find('h2.Title, .Title').first().text().trim();
            const yearText = $(el).find('.Year, .Date').first().text().trim();
            const itemYear = yearText ? parseInt(yearText, 10) : undefined;

            if (href && itemTitle) {
                candidates.push({ href, title: itemTitle, year: itemYear });
            }
        });

        if (candidates.length === 0) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }

        // Match best candidate by title and release year
        const normalizedTarget = cleanTitle.toLowerCase();
        let selectedCandidate = candidates.find((c) => {
            const norm = c.title.toLowerCase();
            const titleMatch = norm === normalizedTarget || norm.includes(normalizedTarget) || normalizedTarget.includes(norm);
            if (!titleMatch) return false;
            if (year && c.year) {
                return Math.abs(c.year - year) <= 1;
            }
            return true;
        });

        if (!selectedCandidate) {
            // Fall back to exact title match without year constraint
            selectedCandidate = candidates.find((c) => c.title.toLowerCase() === normalizedTarget);
        }

        if (!selectedCandidate) {
            // Fall back to first candidate
            selectedCandidate = candidates[0];
        }

        const moviePath = selectedCandidate.href.startsWith('http')
            ? selectedCandidate.href
            : `${this.BASE_URL}${selectedCandidate.href.startsWith('/') ? '' : '/'}${selectedCandidate.href}`;

        const playUrl = `${moviePath.replace(/\/$/, '')}/?play=1080p`;
        const playRes = await fetch(playUrl, {
            headers: this.HEADERS,
            signal: AbortSignal.timeout(3500)
        });

        if (!playRes.ok) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }

        const playHtml = await playRes.text();
        return this.extractSourcesFromHtml(playHtml);
    }

    private async scrapeTV(media: ProviderMediaObject): Promise<ProviderResult> {
        const season = Number((media as any).s || (media as any).season || 1);
        const episode = Number((media as any).e || (media as any).episode || 1);
        const tmdbId = String(media.tmdbId || '');
        const { title } = await this.resolveTitle(media);

        // 1. FAST PATH: Direct slug & TMDB ID probe
        if (title && tmdbId) {
            const slug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            const directUrl = `${this.BASE_URL}/series/${slug}_E${tmdbId}_${season}_${episode}/?play=1080p`;
            try {
                const res = await fetch(directUrl, {
                    headers: this.HEADERS,
                    signal: AbortSignal.timeout(3000)
                });

                if (res.ok) {
                    const html = await res.text();
                    const result = this.extractSourcesFromHtml(html);
                    if (result.sources.length > 0) {
                        return result;
                    }
                }
            } catch {
                // Direct probe failed, proceed to search fallback
            }
        }

        // 2. FALLBACK PATH: Site Search for series slug
        if (!title) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }

        const cleanTitle = title.replace(/[^\w\s-]/gi, ' ').replace(/\s+/g, ' ').trim();
        const searchUrl = `${this.BASE_URL}/?s=${encodeURIComponent(cleanTitle)}`;
        const searchRes = await fetch(searchUrl, {
            headers: this.HEADERS,
            signal: AbortSignal.timeout(3500)
        });

        if (!searchRes.ok) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }

        const searchHtml = await searchRes.text();
        const $ = cheerio.load(searchHtml);
        let seriesPath: string = '';
        for (const el of $('a[href*="/series/"]').toArray()) {
            const href = $(el).attr('href');
            if (!href) continue;
            if (tmdbId && href.includes(`_E${tmdbId}`)) {
                seriesPath = href;
                break;
            }
            if (!seriesPath && href.toLowerCase().includes(cleanTitle.toLowerCase().replace(/\s+/g, '-'))) {
                seriesPath = href;
            }
        }

        if (!seriesPath) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }

        // Build episode play URL: /series/<name>_E<id>_<season>_<episode>/?play=1080p
        const cleanSeries = seriesPath
            .replace(/\/$/, '')
            .replace(/_\d+_\d+$/, '') // strip any existing season/episode suffixes
            .replace(this.BASE_URL, '');

        const epUrl = `${this.BASE_URL}${cleanSeries.startsWith('/') ? '' : '/'}${cleanSeries}_${season}_${episode}/?play=1080p`;

        const playRes = await fetch(epUrl, {
            headers: this.HEADERS,
            signal: AbortSignal.timeout(3500)
        });

        if (!playRes.ok) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }

        const playHtml = await playRes.text();
        return this.extractSourcesFromHtml(playHtml);
    }

    private extractSourcesFromHtml(html: string): ProviderResult {
        const sources: Source[] = [];
        const $ = cheerio.load(html);

        // 1. Detect Audio Tracks
        const hasCZ = /cz dabing/i.test(html);
        const hasSK = /sk dabing/i.test(html);
        const hasTitulky = /titulky/i.test(html);

        const allAudioTracks: AudioTrack[] = [];
        if (hasTitulky || (!hasCZ && !hasSK)) {
            allAudioTracks.push({ language: 'en', label: 'Original (Titulky)' });
        }
        if (hasCZ) {
            allAudioTracks.push({ language: 'cs', label: 'Czech (CZ Dabing)' });
        }
        if (hasSK) {
            allAudioTracks.push({ language: 'sk', label: 'Slovak (SK Dabing)' });
        }
        if (allAudioTracks.length === 0) {
            allAudioTracks.push({ language: 'en', label: 'English' });
        }

        // 2. Extract Raw Streams
        const streamItems: Array<{ url: string; quality: string }> = [];

        $('video source').each((_, el) => {
            const rawSrc = $(el).attr('src');
            const label = $(el).attr('label') || $(el).attr('res') || $(el).attr('size') || '1080p';
            if (rawSrc) {
                streamItems.push({ url: rawSrc, quality: label });
            }
        });

        if (streamItems.length === 0) {
            const directVideoSrc = $('video').attr('src');
            if (directVideoSrc) {
                streamItems.push({ url: directVideoSrc, quality: '1080p' });
            } else {
                // Regex fallback for player.src({ src: '...' })
                const playerMatch = html.match(/player\.src\(\s*\{\s*src:\s*['"]([^'"]+)['"]/i);
                if (playerMatch?.[1]) {
                    streamItems.push({ url: playerMatch[1], quality: '1080p' });
                }
            }
        }

        if (streamItems.length === 0) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }

        // 3. Normalize & Proxy Streams
        for (const item of streamItems) {
            let fullSrc = item.url.trim();
            if (!fullSrc || fullSrc.includes('netflix.mp4') || fullSrc.includes('sample.mp4')) {
                continue;
            }
            if (fullSrc.startsWith('//')) {
                fullSrc = `https:${fullSrc}`;
            } else if (fullSrc.startsWith('/')) {
                fullSrc = `${this.BASE_URL}${fullSrc}`;
            }

            const isM3U8 = fullSrc.includes('.m3u8');
            const ext = isM3U8 ? '.m3u8' : '.mp4';
            const quality = item.quality || '1080p';

            const proxyHeaders = {
                'User-Agent': this.HEADERS['User-Agent'],
                'Referer': `${this.BASE_URL}/`,
                'Origin': this.BASE_URL
            };
            const proxyData = JSON.stringify({ url: fullSrc, headers: proxyHeaders });
            const proxiedUrl = `http://localhost:3000/v1/proxy?data=${encodeURIComponent(proxyData)}&provider=${this.id}&ext=${ext}`;

            // Add standard stream entry with full audioTracks metadata
            sources.push({
                url: proxiedUrl,
                quality,
                type: isM3U8 ? 'hls' : 'mp4',
                server: `Direct ${quality}`,
                audioTracks: allAudioTracks,
                provider: {
                    name: `${this.name} (${quality})`,
                    id: `${this.id}-${quality.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                }
            });

            // Dedicated CZ Dabing entry for frontend server pickers
            if (hasCZ) {
                sources.push({
                    url: proxiedUrl,
                    quality,
                    type: isM3U8 ? 'hls' : 'mp4',
                    server: `CZ Dabing (${quality})`,
                    audioTracks: [{ language: 'cs', label: 'Czech (CZ Dabing)' }],
                    provider: {
                        name: `${this.name} CZ (${quality})`,
                        id: `${this.id}-cz-${quality.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                    }
                });
            }

            // Dedicated SK Dabing entry for frontend server pickers
            if (hasSK) {
                sources.push({
                    url: proxiedUrl,
                    quality,
                    type: isM3U8 ? 'hls' : 'mp4',
                    server: `SK Dabing (${quality})`,
                    audioTracks: [{ language: 'sk', label: 'Slovak (SK Dabing)' }],
                    provider: {
                        name: `${this.name} SK (${quality})`,
                        id: `${this.id}-sk-${quality.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                    }
                });
            }
        }

        return { sources, subtitles: [], diagnostics: [] };
    }
}
