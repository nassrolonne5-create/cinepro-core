import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source,
    Subtitle
} from '@omss/framework';
import {
    twodhive,
    reanime,
    megaplay,
    anikoto,
    aniwave,
    animeparadise,
    animesogo
} from 'kaizoku-core';

interface AnimeMeta {
    isAnime: boolean;
    anilistId?: string;
    malId?: number;
    title: string;
    romajiTitle?: string;
}

const animeMetaCache = new Map<string, AnimeMeta>();

export class AnimeHubProvider extends BaseProvider {
    readonly id = 'animehub';
    readonly name = 'AnimeHub';
    readonly enabled = true;
    readonly BASE_URL = 'https://graphql.anilist.co';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.resolveAnimeStreams(media, 1, 1);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const season = Number((media as any).s || (media as any).season || 1);
        const episode = Number((media as any).e || (media as any).episode || 1);
        return this.resolveAnimeStreams(media, season, episode);
    }

    private async detectAndMapAnime(media: ProviderMediaObject, season: number): Promise<AnimeMeta> {
        const cacheKey = `${media.type}:${media.tmdbId}:s${season}`;
        if (animeMetaCache.has(cacheKey)) {
            return animeMetaCache.get(cacheKey)!;
        }

        const envKey = process.env.TMDB_API_KEY;
        const tmdbApiKey = (envKey && envKey !== 'fake_key' && envKey !== 'your_tmdb_api_key_here')
            ? envKey
            : '5201b54eb0968700e693a30576d7d4dc';

        let title = (media.title || '').trim();
        let isAnime = false;
        let tmdbChecked = false;
        let anilistId: string | undefined;
        let malId: number | undefined;
        let romajiTitle: string | undefined;

        const initialSearch = title && !/^\d+$/.test(title)
            ? (season > 1 ? `${title} Season ${season}` : title)
            : '';

        // Run TMDB genre/origin check and AniList GraphQL lookup in parallel
        const [tmdbSettled, gqlSettled] = await Promise.allSettled([
            fetch(
                `https://api.themoviedb.org/3/${media.type === 'movie' ? 'movie' : 'tv'}/${media.tmdbId}?api_key=${tmdbApiKey}`,
                { signal: AbortSignal.timeout(3000) }
            ).then(r => (r.ok ? r.json() : null)),
            initialSearch
                ? fetch('https://graphql.anilist.co', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                      body: JSON.stringify({
                          query: `query ($search: String, $type: MediaType) {
                              Media(search: $search, type: $type, format_in: [TV, TV_SHORT, MOVIE, ONA, OVA]) {
                                  id
                                  idMal
                                  title { romaji english }
                              }
                          }`,
                          variables: { search: initialSearch, type: 'ANIME' }
                      }),
                      signal: AbortSignal.timeout(3000)
                  }).then(r => (r.ok ? r.json() : null))
                : Promise.resolve(null)
        ]);

        const tmdbData = tmdbSettled.status === 'fulfilled' ? (tmdbSettled.value as any) : null;
        if (tmdbData) {
            tmdbChecked = true;
            title = tmdbData.name || tmdbData.title || title;
            const origLang = tmdbData.original_language || '';
            const genres: Array<{ id: number; name: string }> = Array.isArray(tmdbData.genres) ? tmdbData.genres : [];
            const hasAnimationGenre = genres.some(g => g.id === 16 || (g.name || '').toLowerCase().includes('anim'));
            const originCountries: string[] = Array.isArray(tmdbData.origin_country) ? tmdbData.origin_country : [];
            if (hasAnimationGenre && (origLang === 'ja' || origLang === 'zh' || origLang === 'ko' || originCountries.includes('JP'))) {
                isAnime = true;
            }
        }

        let gqlData = gqlSettled.status === 'fulfilled' ? (gqlSettled.value as any) : null;
        if (!gqlData && isAnime && title) {
            try {
                const searchQuery = season > 1 ? `${title} Season ${season}` : title;
                const gqlRes = await fetch('https://graphql.anilist.co', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({
                        query: `query ($search: String, $type: MediaType) {
                            Media(search: $search, type: $type, format_in: [TV, TV_SHORT, MOVIE, ONA, OVA]) {
                                id
                                idMal
                                title { romaji english }
                            }
                        }`,
                        variables: { search: searchQuery, type: 'ANIME' }
                    }),
                    signal: AbortSignal.timeout(2500)
                });
                if (gqlRes.ok) {
                    gqlData = await gqlRes.json();
                }
            } catch {}
        }

        const mediaNode = gqlData?.data?.Media;
        if (mediaNode?.id) {
            anilistId = String(mediaNode.id);
            malId = mediaNode.idMal || undefined;
            romajiTitle = mediaNode.title?.romaji || undefined;
        }

        if (!isAnime) {
            const nonAnime: AnimeMeta = { isAnime: false, title };
            if (tmdbChecked) {
                animeMetaCache.set(cacheKey, nonAnime);
            }
            return nonAnime;
        }

        const meta: AnimeMeta = {
            isAnime: true,
            anilistId,
            malId,
            title: season > 1 ? `${title} Season ${season}` : title,
            romajiTitle
        };
        animeMetaCache.set(cacheKey, meta);
        return meta;
    }

    private formatAnimeResult(
        providerLabel: string,
        providerSlug: string,
        mode: 'sub' | 'dub',
        streamData: any,
        sourcesOut: Source[],
        subtitlesOut: Subtitle[]
    ) {
        if (!streamData || !Array.isArray(streamData.sources) || streamData.sources.length === 0) return;

        const headers = streamData.headers || {};
        const modeLabel = mode === 'dub' ? 'English Dub' : 'Original Sub';
        const modeShort = mode === 'dub' ? 'Dub' : 'Sub';

        for (const src of streamData.sources) {
            if (!src?.url) continue;
            const quality = src.quality && src.quality !== 'default' ? src.quality : '1080p';
            const proxiedUrl = Object.keys(headers).length > 0
                ? this.createProxyUrl(src.url, headers)
                : src.url;

            const serverName = `${providerLabel} (${modeShort} ${quality})`;
            sourcesOut.push({
                url: proxiedUrl,
                quality: `${quality} | ${modeShort.toUpperCase()}`,
                type: src.isM3U8 || src.url.includes('.m3u8') ? 'hls' : 'mp4',
                server: serverName,
                audioTracks: mode === 'dub'
                    ? [{ language: 'en', label: 'English (Dub)' }]
                    : [
                        { language: 'ja', label: 'Japanese (Original)' },
                        { language: 'en', label: 'English Subtitled' }
                    ],
                provider: {
                    name: serverName,
                    id: `${this.id}-${providerSlug}-${mode}-${quality.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                }
            });
        }

        if (Array.isArray(streamData.subtitles)) {
            for (const sub of streamData.subtitles) {
                if (!sub?.url || (sub.lang || '').toLowerCase().includes('thumbnails')) continue;
                subtitlesOut.push({
                    url: sub.url,
                    language: (sub.lang || 'en').slice(0, 2).toLowerCase(),
                    label: sub.lang || `${providerLabel} (${modeLabel})`,
                    format: sub.url.endsWith('.ass') ? 'ass' : 'vtt'
                } as Subtitle);
            }
        }
    }

    private async resolveAnimeStreams(
        media: ProviderMediaObject,
        season: number,
        episode: number
    ): Promise<ProviderResult> {
        const meta = await this.detectAndMapAnime(media, season);
        if (!meta.isAnime) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }

        const sources: Source[] = [];
        const subtitles: Subtitle[] = [];
        const timeout = <T>(p: Promise<T>, ms: number): Promise<T | null> =>
            Promise.race([
                p,
                new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))
            ]).catch(() => null);

        const tasks: Array<Promise<void>> = [];

        // 1. AniList-direct engines: 2DHive, ReAnime & MegaPlay
        if (meta.anilistId) {
            const anilistId = meta.anilistId;

            // Engine A: 2DHive (Sub + Dub + Multi-Subtitles)
            tasks.push((async () => {
                const info = await timeout(twodhive.fetchAnimeInfo(anilistId), 2800);
                const epObj = info?.episodes?.find((e: any) => Number(e.number) === episode) || info?.episodes?.[episode - 1];
                if (!epObj?.id) return;

                const subPromise = timeout(twodhive.fetchSources(epObj.id, 'sub'), 2800);
                const dubPromise = epObj.hasDub ? timeout(twodhive.fetchSources(epObj.id, 'dub'), 2800) : Promise.resolve(null);
                const [subData, dubData] = await Promise.all([subPromise, dubPromise]);
                this.formatAnimeResult('2DHive', '2dhive', 'sub', subData, sources, subtitles);
                this.formatAnimeResult('2DHive', '2dhive', 'dub', dubData, sources, subtitles);
            })());

            // Engine B: ReAnime (Sub + Dub + Multi-Subtitles)
            tasks.push((async () => {
                const info = await timeout(reanime.fetchAnimeInfo(anilistId), 4200);
                const epObj = info?.episodes?.find((e: any) => Number(e.number) === episode) || info?.episodes?.[episode - 1];
                if (!epObj?.id) return;

                const subPromise = timeout(reanime.fetchSources(epObj.id, 'sub'), 2800);
                const dubPromise = epObj.hasDub !== false ? timeout(reanime.fetchSources(epObj.id, 'dub'), 2800) : Promise.resolve(null);
                const [subData, dubData] = await Promise.all([subPromise, dubPromise]);
                this.formatAnimeResult('ReAnime', 'reanime', 'sub', subData, sources, subtitles);
                this.formatAnimeResult('ReAnime', 'reanime', 'dub', dubData, sources, subtitles);
            })());

            // Engine C: MegaPlay (Direct AniList stream extraction)
            tasks.push((async () => {
                const [subData, dubData] = await Promise.all([
                    timeout(megaplay.fetchSources(anilistId, 'sub', episode, meta.malId), 2800),
                    timeout(megaplay.fetchSources(anilistId, 'dub', episode, meta.malId), 2800)
                ]);
                this.formatAnimeResult('MegaPlay', 'megaplay', 'sub', subData, sources, subtitles);
                this.formatAnimeResult('MegaPlay', 'megaplay', 'dub', dubData, sources, subtitles);
            })());
        }

        // 2. Title-search engines: AniKoto, AniWave, AnimeParadise, AnimeSogo
        const searchTitle = meta.title || meta.romajiTitle || '';
        if (searchTitle) {
            const searchEngines: Array<{ name: string; slug: string; mod: any }> = [
                { name: 'AniKoto', slug: 'anikoto', mod: anikoto },
                { name: 'AniWave', slug: 'aniwave', mod: aniwave },
                { name: 'AnimeParadise', slug: 'animeparadise', mod: animeparadise },
                { name: 'AnimeSogo', slug: 'animesogo', mod: animesogo }
            ];

            for (const eng of searchEngines) {
                tasks.push((async () => {
                    const searchRes: any = await timeout(eng.mod.search(searchTitle), 2800);
                    const results = searchRes?.results || searchRes?.data || [];
                    const first = results[0];
                    if (!first?.id) return;

                    const info: any = await timeout(eng.mod.fetchAnimeInfo(first.id), 2800);
                    const epObj = info?.episodes?.find((e: any) => Number(e.number) === episode) || info?.episodes?.[episode - 1];
                    if (!epObj?.id) return;

                    const subPromise = timeout(eng.mod.fetchSources(epObj.id, 'sub'), 3000);
                    const dubPromise = epObj.hasDub !== false ? timeout(eng.mod.fetchSources(epObj.id, 'dub'), 3000) : Promise.resolve(null);
                    const [subData, dubData] = await Promise.all([subPromise, dubPromise]);
                    this.formatAnimeResult(eng.name, eng.slug, 'sub', subData, sources, subtitles);
                    this.formatAnimeResult(eng.name, eng.slug, 'dub', dubData, sources, subtitles);
                })());
            }
        }

        await Promise.allSettled(tasks);

        return {
            sources,
            subtitles,
            diagnostics: []
        };
    }
}
