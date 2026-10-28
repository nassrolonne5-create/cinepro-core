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

const TALK_SHOW_MAP: Record<string, { slug: string; title: string }> = {
    '1220': { slug: 'the-graham-norton-show', title: 'The Graham Norton Show' },
    '63770': { slug: 'the-late-show-with-stephen-colbert', title: 'The Late Show with Stephen Colbert' },
    '59941': { slug: 'the-tonight-show-starring-jimmy-fallon', title: 'The Tonight Show Starring Jimmy Fallon' },
    '14981': { slug: 'jimmy-kimmel-live', title: 'Jimmy Kimmel Live!' },
    '61818': { slug: 'late-night-with-seth-meyers', title: 'Late Night with Seth Meyers' },
    '2224': { slug: 'the-daily-show', title: 'The Daily Show' },
    '60694': { slug: 'last-week-tonight-with-john-oliver', title: 'Last Week Tonight with John Oliver' },
    '1900': { slug: 'live-with-kelly-and-mark', title: 'Live with Kelly and Mark' },
    '4573': { slug: 'real-time-with-bill-maher', title: 'Real Time with Bill Maher' },
    '1667': { slug: 'saturday-night-live', title: 'Saturday Night Live' }
};

export class TalkShowProvider extends BaseProvider {
    readonly id = 'talkshow';
    readonly name = 'TalkShow';
    readonly enabled = true;
    readonly BASE_URL = 'https://watchseries.pe';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://watchseries.pe/'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['tv', 'movies']
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
        const tmdbId = String(media.tmdbId);
        const showInfo = TALK_SHOW_MAP[tmdbId];

        const sources: Source[] = [];
        const subtitles: Subtitle[] = [];

        // 1. Native WatchSeries TalkShow scraper when matching talk show ID
        if (media.type === 'tv' && showInfo) {
            try {
                const searchUrl = `${this.BASE_URL}/tv-series/${showInfo.slug}-season-${season}-episode-${episode}`;
                const searchRes = await fetch(searchUrl, {
                    headers: this.HEADERS,
                    redirect: 'follow',
                    signal: AbortSignal.timeout(4000)
                });

                let showPageHtml = '';
                let showPageUrl = '';

                if (searchRes.ok) {
                    const html = await searchRes.text();
                    if (html.includes('data-episode-id') || html.includes('data-link-id')) {
                        showPageHtml = html;
                        showPageUrl = searchRes.url;
                    }
                }

                if (!showPageHtml) {
                    const q = encodeURIComponent(showInfo.title);
                    const sRes = await fetch(`${this.BASE_URL}/search/${q}`, {
                        headers: this.HEADERS,
                        signal: AbortSignal.timeout(3500)
                    });
                    if (sRes.ok) {
                        const sHtml = await sRes.text();
                        const hrefMatches = [...sHtml.matchAll(/href="(\/watch-tv\/[^"]+)"/g)].map(m => m[1]);
                        const uniqueHrefs = [...new Set(hrefMatches)];
                        const targetSlug = `/watch-tv/watch-${showInfo.slug}-online-`;
                        const matchedHref = uniqueHrefs.find(h => h.startsWith(targetSlug)) || uniqueHrefs[0];

                        if (matchedHref) {
                            showPageUrl = `${this.BASE_URL}${matchedHref}`;
                            const pRes = await fetch(showPageUrl, {
                                headers: this.HEADERS,
                                signal: AbortSignal.timeout(3500)
                            });
                            if (pRes.ok) {
                                showPageHtml = await pRes.text();
                            }
                        }
                    }
                }

                if (showPageHtml) {
                    let linkId = '';
                    const seasonMatch = showPageUrl.match(/season-(\d+)/i);
                    const pageSeason = seasonMatch ? Number(seasonMatch[1]) : season;

                    if (pageSeason === season) {
                        const epRegex = new RegExp(`data-link-id="(\\d+)"[^>]*>[\\s\\S]{0,400}?Eps\\s*0*${episode}\\s*:`, 'i');
                        const m = showPageHtml.match(epRegex);
                        if (m?.[1]) {
                            linkId = m[1];
                        }
                    }

                    if (!linkId) {
                        const firstLink = showPageHtml.match(/data-link-id="(\d+)"/);
                        if (firstLink?.[1]) linkId = firstLink[1];
                    }

                    if (linkId) {
                        const ajaxRes = await fetch(`${this.BASE_URL}/ajax/episode/ servers/${linkId}`.replace(' ', ''), {
                            headers: {
                                ...this.HEADERS,
                                'X-Requested-With': 'XMLHttpRequest',
                                'Referer': showPageUrl || `${this.BASE_URL}/`
                            },
                            signal: AbortSignal.timeout(3500)
                        });
                        if (ajaxRes.ok) {
                            const serversHtml = await ajaxRes.text();
                            const serverIds = [...serversHtml.matchAll(/data-id="(\d+)"/g)].map(m => m[1]);
                            for (const sId of serverIds.slice(0, 2)) {
                                try {
                                    const srcRes = await fetch(`${this.BASE_URL}/ajax/episode/sources/${sId}`, {
                                        headers: {
                                            ...this.HEADERS,
                                            'X-Requested-With': 'XMLHttpRequest',
                                            'Referer': showPageUrl || `${this.BASE_URL}/`
                                        },
                                        signal: AbortSignal.timeout(3000)
                                    });
                                    if (!srcRes.ok) continue;
                                    const srcJson = (await srcRes.json()) as any;
                                    const embedLink = srcJson?.link;
                                    if (!embedLink || typeof embedLink !== 'string') continue;

                                    const embedUrlObj = new URL(embedLink);
                                    const embedOrigin = embedUrlObj.origin;
                                    const pathParts = embedUrlObj.pathname.split('/').filter(Boolean);
                                    const videoId = pathParts[pathParts.length - 1];
                                    const prefix = pathParts.slice(0, -1).join('/');

                                    const embedPageRes = await fetch(embedLink, {
                                        headers: {
                                            'User-Agent': this.HEADERS['User-Agent'],
                                            'Referer': `${this.BASE_URL}/`
                                        },
                                        signal: AbortSignal.timeout(3000)
                                    });
                                    if (!embedPageRes.ok) continue;
                                    const embedHtml = await embedPageRes.text();

                                    const nonce =
                                        embedHtml.match(/_is_th:([a-zA-Z0-9]{32,64})/)?.[1] ||
                                        embedHtml.match(/window\._lk_db\s*=\s*\{x:\s*"([a-zA-Z0-9]+)",\s*y:\s*"([a-zA-Z0-9]+)",\s*z:\s*"([a-zA-Z0-9]+)"\}/)?.slice(1, 4).join('') ||
                                        embedHtml.match(/"([a-zA-Z0-9]{48})"/)?.[1];

                                    if (!nonce) continue;

                                    const getSourcesUrl = `${embedOrigin}/${prefix}/getSources?id=${videoId}&_k=${nonce}`;
                                    const gsRes = await fetch(getSourcesUrl, {
                                        headers: {
                                            'User-Agent': this.HEADERS['User-Agent'],
                                            'Referer': embedLink,
                                            'X-Requested-With': 'XMLHttpRequest'
                                        },
                                        signal: AbortSignal.timeout(3000)
                                    });
                                    if (!gsRes.ok) continue;
                                    const gsData = (await gsRes.json()) as any;

                                    if (Array.isArray(gsData?.sources)) {
                                        for (const s of gsData.sources) {
                                            if (s?.file && typeof s.file === 'string' && s.file.startsWith('http')) {
                                                const proxiedUrl = this.createProxyUrl(s.file, {
                                                    'User-Agent': this.HEADERS['User-Agent'],
                                                    'Referer': `${embedOrigin}/`,
                                                    'Origin': embedOrigin
                                                });
                                                sources.push({
                                                    url: proxiedUrl,
                                                    quality: '1080p',
                                                    type: 'hls',
                                                    server: 'LateNight HD',
                                                    audioTracks: [{ language: 'en', label: 'English' }],
                                                    provider: {
                                                        name: `${this.name} (LateNight HD)`,
                                                        id: `${this.id}-latenight`
                                                    }
                                                });
                                            }
                                        }
                                    }
                                    if (sources.length > 0) break;
                                } catch {}
                            }
                        }
                    }
                }
            } catch {}
        }

        if (sources.length > 0) {
            return { sources, subtitles, diagnostics: [] };
        }

        // 2. Universal TV & Movie fallback via VidNest v2 + RiveStream
        const v2 = await resolveVidnestV2(
            media,
            this.id,
            this.name,
            (u, h) => this.createProxyUrl(u, h),
            [
                { name: 'LateNight HD', path: 'flixhq' },
                { name: 'Broadcast Cloud', path: 'nextgencloudfabric' }
            ],
            3200
        );
        if (v2.sources.length > 0) {
            return { sources: v2.sources, subtitles: v2.subtitles, diagnostics: [] };
        }

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
