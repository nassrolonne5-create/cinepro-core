import { OMSSErrors } from '@omss/framework';
import crypto from 'node:crypto';

export enum ProviderTier {
    TIER_1_INSTANT = 1,  // Lightning direct scrapers (timeout 3500ms)
    TIER_2_DEEP = 2      // Deep aggregators & multi-hop scrapers (timeout 6000ms)
}

export function getProviderTier(providerId: string, providerName: string): ProviderTier {
    const id = (providerId || '').toLowerCase();
    const name = (providerName || '').toLowerCase();

    // Tier 2: Deep multi-hop scrapers that take longer or frequently hit Cloudflare
    if (
        id.includes('vidnest') || name.includes('vidnest') ||
        id.includes('vidup') || name.includes('vidup') ||
        id.includes('vidrift') || name.includes('vidrift') ||
        id.includes('vidsrc') && !id.includes('vidsrcwin') ||
        id.includes('talkshow') || name.includes('talkshow') ||
        id.includes('mapple') || name.includes('mapple') ||
        id.includes('subtitles') || name.includes('subtitles')
    ) {
        return ProviderTier.TIER_2_DEEP;
    }

    // Tier 1: Fast direct scrapers (trendimovies, videasy, rivestream, embedsu, vidlink, vidgod, cinesu, lmscript, icefy, cinemaarmy, purstream, sflix, superstream, vidfast, watchflix, vidvault, vidsrcwin, vixsrc, cinecat, vidrock, vidzee, streamx)
    return ProviderTier.TIER_1_INSTANT;
}

// ==========================================
// PILLAR 3: Fail-Fast Circuit Breakers
// ==========================================
interface CircuitBreakerStatus {
    consecutiveFailures: number;
    lastFailureTime: number;
    isOpen: boolean;
}

const circuitBreakers = new Map<string, CircuitBreakerStatus>();
const CIRCUIT_BREAKER_FAIL_THRESHOLD = 3;
const CIRCUIT_BREAKER_COOLDOWN_MS = 60 * 1000; // 60s cooldown

export function isProviderCircuitOpen(providerId: string): boolean {
    const status = circuitBreakers.get(providerId);
    if (!status) return false;
    if (status.isOpen) {
        if (Date.now() - status.lastFailureTime > CIRCUIT_BREAKER_COOLDOWN_MS) {
            status.isOpen = false;
            status.consecutiveFailures = 0;
            return false;
        }
        return true;
    }
    return false;
}

export function recordProviderSuccess(providerId: string) {
    const status = circuitBreakers.get(providerId);
    if (status) {
        status.consecutiveFailures = 0;
        status.isOpen = false;
    }
}

export function recordProviderFailure(providerId: string) {
    let status = circuitBreakers.get(providerId);
    if (!status) {
        status = { consecutiveFailures: 1, lastFailureTime: Date.now(), isOpen: false };
        circuitBreakers.set(providerId, status);
    } else {
        status.consecutiveFailures++;
        status.lastFailureTime = Date.now();
        if (status.consecutiveFailures >= CIRCUIT_BREAKER_FAIL_THRESHOLD) {
            status.isOpen = true;
            console.warn(`[ThreePillars] Circuit breaker OPEN for '${providerId}' (${status.consecutiveFailures} consecutive failures). Cooldown: 60s.`);
        }
    }
}

// ==========================================
// PILLAR 1: Outbound Request Pooling / Concurrency Limiter
// ==========================================
export async function runWithConcurrencyLimit<T>(
    tasks: Array<() => Promise<T>>,
    limit: number
): Promise<T[]> {
    if (tasks.length === 0) return [];
    const results: T[] = new Array(tasks.length);
    let currentIndex = 0;

    async function worker() {
        while (currentIndex < tasks.length) {
            const index = currentIndex++;
            try {
                results[index] = await tasks[index]();
            } catch {
                results[index] = null as any;
            }
        }
    }

    const workerCount = Math.min(limit, tasks.length);
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workers);
    return results;
}

// ==========================================
// PILLAR 3: Universal Namespacing, Deduplication & Sanitization
// ==========================================
export function formatAndNamespaceSources(sources: any[], publicBaseUrl: string = 'http://localhost:3000'): any[] {
    if (!Array.isArray(sources)) return [];

    const filtered = sources.filter((s: any) => {
        const rawUrl = (s.url || '').toLowerCase();
        let url = rawUrl;
        try { url = decodeURIComponent(rawUrl); } catch {}
        const server = (s.server || '').toLowerCase();
        const quality = (s.quality || '').toLowerCase();
        const provName = (s.provider?.name || s.provider?.id || s.provider || '').toLowerCase();

        // Dead, blocked, 404, or Cloudflare captcha hosts
        const isHlsTxt = url.includes('master.txt') || url.includes('index.txt') || url.includes('playlist.txt') || url.includes('/hls');
        if (
            url.includes('boomchick.org') ||
            url.includes('boomchick') ||
            url.includes('neward.cyou') ||
            url.includes('4pa.top') ||
            url.includes('professionaladvisory.sbs') ||
            url.includes('streamflixserver.site') ||
            url.includes('cf.streamflixserver') ||
            url.includes('goodstream.cc') ||
            url.includes('staticreverie.site') ||
            url.includes('animecurx.tech') ||
            url.includes('halcyoncreative.site') ||
            url.includes('homechefrecipes.sbs') ||
            url.includes('boltx.stream') ||
            url.includes('bestx.stream') ||
            url.includes('appnumber.top') ||
            url.includes('steman.cyou') ||
            url.includes('onlinevisibilitysystem.site') ||
            url.includes('highperformanceread.com') ||
            url.includes('moon.zenoak.top/s/') ||
            ((url.endsWith('.txt') || url.includes('.txt?')) && !isHlsTxt)
        ) return false;

        // Promotional teaser / sample short videos
        if (
            url.includes('aoneroom.com') ||
            url.includes('animanga.fun') ||
            url.includes('tiktoks') ||
            url.includes('streamx.me/videos/netflix.mp4') ||
            url.includes('/sample/') ||
            url.includes('sample.mp4') ||
            url.includes('trailer.mp4') ||
            url.includes('/promo/') ||
            url.includes('promo/cinecat')
        ) return false;

        // Silent / video-only streams without audio
        if (url.includes('rousav.tech') || server.includes('apogee')) return false;

        // Foreign non-English dubbed mirror hosts
        if (
            url.includes('cheaptruckrepairs.cc') ||
            url.includes('480ptvseries.com') ||
            url.includes('vividdubbing') ||
            url.includes('hindi') ||
            url.includes('punjabi') ||
            url.includes('tamil') ||
            url.includes('telugu') ||
            url.includes('latino') ||
            url.includes('dublado') ||
            url.includes('castellano') ||
            server.includes('hindi') ||
            server.includes('punjabi') ||
            server.includes('tamil') ||
            server.includes('telugu') ||
            server.includes('latino') ||
            server.includes('dublado') ||
            server.includes('castellano') ||
            quality.includes('hindi') ||
            quality.includes('punjabi') ||
            quality.includes('tamil') ||
            quality.includes('telugu') ||
            quality.includes('latino') ||
            quality.includes('dublado') ||
            quality.includes('castellano') ||
            provName.includes('hindi') ||
            provName.includes('punjabi') ||
            provName.includes('tamil') ||
            provName.includes('telugu')
        ) return false;

        return true;
    });

    for (const src of filtered) {
        const rawProvName = (typeof src.provider === 'string' ? src.provider : (src.provider?.name || src.provider?.id || 'Server')).trim();
        const provBase = rawProvName.replace(/\s*\([^)]*\)$/, '').trim() || 'Server';
        const rawServer = (src.server || '').trim();

        let formattedServer = rawServer;
        if (!formattedServer || formattedServer.toLowerCase() === 'unknown') {
            const subTag = rawProvName.includes('(') ? rawProvName.replace(/^.*\(([^)]+)\).*$/, '$1') : 'Stream';
            formattedServer = `${provBase} (${subTag})`;
        } else if (
            formattedServer.toLowerCase().startsWith('direct') ||
            formattedServer.toLowerCase().startsWith('mirror') ||
            formattedServer.toLowerCase() === 'fast' ||
            formattedServer.toLowerCase() === 'prime'
        ) {
            formattedServer = `${provBase} (${formattedServer})`;
        } else if (!formattedServer.toLowerCase().includes(provBase.toLowerCase())) {
            formattedServer = `${provBase} (${formattedServer})`;
        }

        src.server = formattedServer;

        const serverSlug = formattedServer.toLowerCase().replace(/[^a-z0-9]/g, '');
        const qualSlug = (src.quality || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const provId = typeof src.provider === 'object' && src.provider?.id ? src.provider.id : provBase.toLowerCase().replace(/[^a-z0-9]/g, '');
        let baseId = provId.includes(serverSlug) ? provId : `${provId}-${serverSlug}`;
        if (qualSlug && !baseId.includes(qualSlug)) {
            baseId = `${baseId}-${qualSlug}`;
        }
        src.provider = {
            name: formattedServer,
            id: baseId
        };

        if (src.type === 'mkv') {
            src.type = 'mp4';
        }

        // Universal Mirage 4K (cine4k.mpddash.workers.dev) & ValhallaStream unwrapper
        if (src.url && src.url.includes('valhallastream.com')) {
            try {
                const parsed = new URL(src.url);
                const innerUrl = parsed.searchParams.get('url');
                const rawInnerHeaders = parsed.searchParams.get('headers');
                if (innerUrl) {
                    const headers = innerUrl.includes('cine4k.mpddash.workers.dev')
                        ? { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' }
                        : (rawInnerHeaders ? JSON.parse(rawInnerHeaders) : {});
                    src.url = `${publicBaseUrl}/v1/proxy?data=${encodeURIComponent(JSON.stringify({ url: innerUrl, headers }))}`;
                }
            } catch {}
        } else if (src.url && src.url.includes('cine4k.mpddash.workers.dev') && src.url.includes('/v1/proxy')) {
            try {
                const parsed = new URL(src.url, publicBaseUrl);
                const dataParam = parsed.searchParams.get('data');
                if (dataParam) {
                    const decoded = JSON.parse(decodeURIComponent(dataParam));
                    if (decoded?.url?.includes('cine4k.mpddash.workers.dev')) {
                        decoded.headers = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
                        };
                        src.url = `${publicBaseUrl}/v1/proxy?data=${encodeURIComponent(JSON.stringify(decoded))}`;
                    }
                }
            } catch {}
        }

        if (src.url && src.url.includes('/v1/proxy')) {
            src.url = src.url.replace(/^https?:\/\/[^/]+(?=\/v1\/proxy)/, publicBaseUrl);
            if (src.url.startsWith('/v1/proxy')) {
                src.url = publicBaseUrl + src.url;
            }
        }
    }

    return filtered;
}

// Dedup and merge helper
export function mergeSources(targetSources: any[], newSources: any[]): any[] {
    const map = new Map<string, any>();
    for (const s of (targetSources || [])) {
        const key = (s.url || '') + '_' + (s.provider?.id || s.server || '');
        map.set(key, s);
    }
    for (const s of (newSources || [])) {
        const key = (s.url || '') + '_' + (s.provider?.id || s.server || '');
        if (!map.has(key)) {
            map.set(key, s);
        }
    }
    return Array.from(map.values());
}

export function mergeSubtitles(targetSubs: any[], newSubs: any[]): any[] {
    const map = new Map<string, any>();
    for (const s of (targetSubs || [])) {
        map.set(s.url || '', s);
    }
    for (const s of (newSubs || [])) {
        if (!map.has(s.url || '')) {
            map.set(s.url || '', s);
        }
    }
    return Array.from(map.values());
}

// Single-flight in-progress requests
const inFlightRequests = new Map<string, Promise<any>>();
// Background hydration tracker
const activeHarvesters = new Set<string>();

// SSE Progressive Stream Subscriptions
const sseListeners = new Map<string, Set<(event: { type: 'source' | 'done', data: any }) => void>>();

export function subscribeToStreams(cacheKey: string, callback: (event: { type: 'source' | 'done', data: any }) => void): () => void {
    if (!sseListeners.has(cacheKey)) {
        sseListeners.set(cacheKey, new Set());
    }
    sseListeners.get(cacheKey)!.add(callback);
    return () => {
        const set = sseListeners.get(cacheKey);
        if (set) {
            set.delete(callback);
            if (set.size === 0) sseListeners.delete(cacheKey);
        }
    };
}

/**
 * Setup Three-Pillar Architecture onto OMSS SourceService
 */
export function setupThreePillarArchitecture(server: any) {
    const sourceService = server.sourceService;
    if (!sourceService) {
        console.warn('[ThreePillars] No sourceService found on server instance!');
        return;
    }

    function sanitizeSharedResults(results: any[]) {
        for (const res of results) {
            if (res && Array.isArray(res.sources)) {
                for (const s of res.sources) {
                    if (s.url && s.url.startsWith('/v1/proxy')) {
                        s.url = `http://localhost:3000${s.url}`;
                    }
                }
            }
        }
    }

    // Helper to scrape a single provider safely with per-tier timeout and circuit breaker
    async function scrapeProviderSafely(
        provider: any,
        type: 'movie' | 'tv',
        media: any,
        timeoutMs: number,
        onSourceFound?: (result: any) => void
    ) {
        if (isProviderCircuitOpen(provider.id)) {
            console.log(`[ThreePillars] Skipping '${provider.name}' (circuit breaker open)`);
            return { sources: [], subtitles: [], diagnostics: [] };
        }

        const t0 = Date.now();
        try {
            const timeoutPromise = new Promise<any>((resolve) => {
                setTimeout(() => {
                    resolve({ sources: [], subtitles: [], diagnostics: [] });
                }, timeoutMs);
            });

            const scrapePromise = (type === 'movie' 
                ? provider.getMovieSources(media) 
                : provider.getTVSources(media)
            ).then((res: any) => {
                const elapsed = Date.now() - t0;
                if (res && Array.isArray(res.sources) && res.sources.length > 0) {
                    const publicBaseUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
                    sanitizeSharedResults([res]);
                    res.sources = formatAndNamespaceSources(res.sources, publicBaseUrl);
                    if (res.sources.length > 0) {
                        recordProviderSuccess(provider.id);
                        console.log(`[ThreePillars] Provider '${provider.name}' returned ${res.sources.length} server(s) in ${elapsed}ms`);
                        if (onSourceFound) {
                            onSourceFound(res);
                        }
                    }
                }
                return res;
            }).catch((err: any) => {
                const elapsed = Date.now() - t0;
                console.warn(`[ThreePillars] Provider '${provider.name}' failed in ${elapsed}ms: ${err?.message || 'Error'}`);
                if (elapsed < timeoutMs) {
                    recordProviderFailure(provider.id);
                }
                return { sources: [], subtitles: [], diagnostics: [] };
            });

            const result = await Promise.race([scrapePromise, timeoutPromise]);
            if (result && Array.isArray(result.sources) && result.sources.length > 0) {
                return result;
            }
            return { sources: [], subtitles: [], diagnostics: [] };
        } catch (err: any) {
            recordProviderFailure(provider.id);
            const elapsed = Date.now() - t0;
            console.warn(`[ThreePillars] Provider '${provider.name}' error in ${elapsed}ms: ${err?.message || 'Error'}`);
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    // Core Progressive Engine
    async function executeThreePillars(type: 'movie' | 'tv', id: string, season?: number, episode?: number) {
        const cacheKey = type === 'movie' ? `movie:${id}` : `tv:${id}:s${season}:e${episode}`;
        const publicBaseUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

        // 1. CACHE CHECK: Instant response if already cached with rich server set (< 5ms)
        const cached = await sourceService.cache.get(cacheKey);
        if (cached && Array.isArray(cached.sources) && cached.sources.length >= 40) {
            console.log(`[ThreePillars] Cache HIT for ${cacheKey} (${cached.sources.length} sources)`);
            return cached;
        }

        // 2. SINGLE-FLIGHT COALESCING: Avoid concurrent duplicate scrapes for same movie/show
        if (inFlightRequests.has(cacheKey)) {
            console.log(`[ThreePillars] Joining in-flight scrape for ${cacheKey}`);
            return await inFlightRequests.get(cacheKey)!;
        }

        let backgroundHarvesterActive = false;

        const scrapePromise = (async () => {
            console.log(`[ThreePillars] Cache MISS for ${cacheKey}. Executing Three-Pillar Tiered Strategy.`);

            // Pre-warm shared single-flight upstreams immediately on clean sockets before TMDB lookup & provider stampede
            try {
                const { prewarmSharedUpstreams } = await import('./utils/vidnestV2.js');
                prewarmSharedUpstreams({ tmdbId: id, type, season, episode });
            } catch {}

            let media: any;
            try {
                const [mediaObj, imdbId, tvShowCached] = await Promise.all([
                    type === 'movie'
                        ? sourceService.tmdbService.getMediaObject('movie', id)
                        : sourceService.tmdbService.getMediaObject('tv', id, season, episode),
                    sourceService.tmdbService.getImdbId(id, type).catch(() => ''),
                    type === 'tv'
                        ? (async () => {
                            let cachedTv = await sourceService.cache.get(`tmdb:tv:${id}`);
                            if (!cachedTv?.title) {
                                try {
                                    const apiKey = process.env.TMDB_API_KEY || '5201b54eb0968700e693a30576d7d4dc';
                                    const tvRes = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${apiKey}`, {
                                        signal: AbortSignal.timeout(2000)
                                    });
                                    if (tvRes.ok) {
                                        const tvJson = (await tvRes.json()) as any;
                                        if (tvJson?.name || tvJson?.original_name) {
                                            cachedTv = {
                                                title: tvJson.name || tvJson.original_name,
                                                releaseDate: tvJson.first_air_date || ''
                                            };
                                            await sourceService.cache.set(`tmdb:tv:${id}`, cachedTv, 24 * 60 * 60);
                                        }
                                    }
                                } catch {}
                            }
                            return cachedTv;
                        })()
                        : Promise.resolve(null)
                ]);

                media = mediaObj;
                media.imdbId = imdbId ?? '';
                if (type === 'tv') {
                    if (tvShowCached?.title) {
                        media.episodeTitle = media.title;
                        media.title = tvShowCached.title;
                    }
                    if (tvShowCached?.releaseDate) {
                        media.releaseYear = String(new Date(tvShowCached.releaseDate).getFullYear());
                    }
                    media.season = Number(season || (media as any).s || 1);
                    media.episode = Number(episode || (media as any).e || 1);
                    media.s = media.season;
                    media.e = media.episode;
                }
                if (media.releaseYear) {
                    media.year = Number(media.releaseYear);
                }
            } catch {
                const normSeason = Number(season || 1);
                const normEpisode = Number(episode || 1);
                media = {
                    tmdbId: id,
                    imdbId: '',
                    title: id,
                    type,
                    year: new Date().getFullYear(),
                    season: normSeason,
                    episode: normEpisode,
                    s: normSeason,
                    e: normEpisode
                };
            }

            const allProviders = sourceService.registry.getProviders()
                .filter((p: any) => p.capabilities.supportedContentTypes.includes(type === 'movie' ? 'movies' : 'tv'))
                .filter((p: any) => p.enabled);

            // Group into Tiers
            const tier1Providers: any[] = [];
            const tier2Providers: any[] = [];

            for (const p of allProviders) {
                const tier = getProviderTier(p.id, p.name);
                if (tier === ProviderTier.TIER_1_INSTANT) tier1Providers.push(p);
                else tier2Providers.push(p);
            }

            // Prioritize fast single-flight and primary direct scrapers first
            tier1Providers.sort((a, b) => {
                const prio = (id: string) => {
                    if (id === 'watchflix' || id === 'animehub' || id === 'vidsrcwin' || id === 'vixsrc' || id === 'vidgod' || id === 'trendimovies' || id === 'embedsu') return 0;
                    return 1;
                };
                return prio(a.id) - prio(b.id);
            });

            console.log(`[ThreePillars] Partitioned ${allProviders.length} providers: Tier 1 (${tier1Providers.length} fast), Tier 2 (${tier2Providers.length} deep)`);

            // Shared collector for progressive results across all workers
            const sharedResults: any[] = [];

            const onProviderCompleted = async (completedResult: any) => {
                if (!completedResult || !Array.isArray(completedResult.sources) || completedResult.sources.length === 0) return;
                sanitizeSharedResults([completedResult]);
                completedResult.sources = formatAndNamespaceSources(completedResult.sources, publicBaseUrl);
                if (completedResult.sources.length === 0) return;

                if (!sharedResults.includes(completedResult)) {
                    sharedResults.push(completedResult);
                }
                try {
                    const current = await sourceService.cache.get(cacheKey);
                    if (current && Array.isArray(current.sources)) {
                        const merged = mergeSources(current.sources || [], completedResult.sources);
                        if (merged.length > (current.sources?.length || 0)) {
                            const enriched = {
                                ...current,
                                sources: merged,
                                subtitles: mergeSubtitles(current.subtitles || [], completedResult.subtitles || [])
                            };
                            await sourceService.cache.set(cacheKey, enriched, sourceService.cacheTTL.sources);
                            console.log(`[ThreePillars] Progressive cache enrichment for ${cacheKey}: +${completedResult.sources.length} sources from ${completedResult.sources[0]?.server || 'provider'} (Total: ${merged.length})`);
                        }
                    }
                } catch (err: any) {
                    console.error('[ThreePillars] Progressive hydration error:', err?.message);
                }

                // Notify active SSE stream listeners
                const listeners = sseListeners.get(cacheKey);
                if (listeners && listeners.size > 0) {
                    for (const src of completedResult.sources) {
                        for (const l of listeners) {
                            try { l({ type: 'source', data: src }); } catch {}
                        }
                    }
                }
            };

            const getProviderTimeout = (p: any, tier: ProviderTier) => {
                if (p.id === 'watchflix' || p.id === 'streamx' || p.id === 'animehub' || p.id === 'vidfast' || p.id === 'cinecat') return 5500;
                return tier === ProviderTier.TIER_1_INSTANT ? 4200 : 6000;
            };

            // Wrap provider execution to push into shared pool immediately upon resolution
            const makeTask = (provider: any, timeoutMs: number) => async () => {
                const res = await scrapeProviderSafely(provider, type, media, timeoutMs, (completed) => {
                    onProviderCompleted(completed);
                });
                if (res && Array.isArray(res.sources) && res.sources.length > 0) {
                    onProviderCompleted(res);
                }
                return res;
            };

            const tier1Tasks = tier1Providers.map(p => makeTask(p, getProviderTimeout(p, ProviderTier.TIER_1_INSTANT)));
            const tier2Tasks = tier2Providers.map(p => makeTask(p, getProviderTimeout(p, ProviderTier.TIER_2_DEEP)));

            // Launch all Tier 1 & Tier 2 providers with high concurrency (backed by single-flight deduplication in vidnestV2)
            const tier1Promise = runWithConcurrencyLimit(tier1Tasks, 24);
            const tier2Promise = runWithConcurrencyLimit(tier2Tasks, 10);

            // Fast delivery trigger: wait up to 4000ms OR until both tiers finish
            const fastDeliveryTimer = new Promise<void>((resolve) => {
                setTimeout(() => {
                    resolve();
                }, 4000);
            });

            await Promise.race([Promise.allSettled([tier1Promise, tier2Promise]), fastDeliveryTimer]);

            // Check what we have collected so far
            sanitizeSharedResults(sharedResults);
            let initialResponse = sourceService.buildResponse(sharedResults.filter(Boolean));
            initialResponse.sources = formatAndNamespaceSources(initialResponse.sources, publicBaseUrl);

            // If we have >= 40 sources at 4.0s, deliver initial rich batch to the user and hydrate any stragglers in background
            if (initialResponse.sources.length >= 40) {
                console.log(`[ThreePillars] FAST DELIVERY SUCCESS! Delivering ${initialResponse.sources.length} servers in ~4.0s for ${cacheKey}`);

                sourceService.storeResponseIdMapping(initialResponse.responseId, {
                    cacheKey,
                    type,
                    tmdbId: id,
                    season,
                    episode,
                    createdAt: Date.now()
                });
                await sourceService.cache.set(cacheKey, initialResponse, sourceService.cacheTTL.sources);

                backgroundHarvesterActive = true;
                (async () => {
                    try {
                        console.log(`[ThreePillars] Background Harvester waiting for remaining providers on ${cacheKey}...`);
                        await Promise.allSettled([tier1Promise, tier2Promise]);

                        // Stremio addons if available
                        if (sourceService.stremioService?.hasEnabledAddons()) {
                            try {
                                const sRes = type === 'movie'
                                    ? await sourceService.stremioService.getMovieSources(media)
                                    : await sourceService.stremioService.getTVSources(media);
                                if (sRes && Array.isArray(sRes.sources)) onProviderCompleted(sRes);
                            } catch {}
                        }

                        sanitizeSharedResults(sharedResults);
                        const fullResponse = sourceService.buildResponse(sharedResults.filter(Boolean));
                        fullResponse.sources = formatAndNamespaceSources(fullResponse.sources, publicBaseUrl);

                        const currentCached = (await sourceService.cache.get(cacheKey)) || initialResponse;
                        const mergedSources = mergeSources(currentCached.sources || [], fullResponse.sources);
                        const mergedSubs = mergeSubtitles(currentCached.subtitles || [], fullResponse.subtitles);

                        const enriched = {
                            ...currentCached,
                            sources: mergedSources,
                            subtitles: mergedSubs,
                            diagnostics: [...(currentCached.diagnostics || []), ...(fullResponse.diagnostics || [])]
                        };

                        await sourceService.cache.set(cacheKey, enriched, sourceService.cacheTTL.sources);
                        console.log(`[ThreePillars] Background Harvester complete for ${cacheKey}! Cache hydrated from ${initialResponse.sources.length} to ${mergedSources.length} servers!`);
                    } catch (err: any) {
                        console.error(`[ThreePillars] Background Harvester error:`, err?.message);
                    } finally {
                        const listeners = sseListeners.get(cacheKey);
                        if (listeners && listeners.size > 0) {
                            for (const l of listeners) {
                                try { l({ type: 'done', data: { status: 'complete' } }); } catch {}
                            }
                        }
                    }
                })().catch(() => {});

                return initialResponse;
            }

            // Fallback: Wait for Tier 1 and Tier 2 to completely finish
            console.log(`[ThreePillars] Fast batch had ${initialResponse.sources.length} servers. Awaiting full Tier 1 & Tier 2 resolution...`);
            await Promise.allSettled([tier1Promise, tier2Promise]);

            sanitizeSharedResults(sharedResults);
            const finalResponse = sourceService.buildResponse(sharedResults.filter(Boolean));
            finalResponse.sources = formatAndNamespaceSources(finalResponse.sources, publicBaseUrl);

            if (finalResponse.sources.length === 0) {
                throw OMSSErrors.noSourcesAvailable(id, allProviders.length);
            }

            sourceService.storeResponseIdMapping(finalResponse.responseId, {
                cacheKey,
                type,
                tmdbId: id,
                season,
                episode,
                createdAt: Date.now()
            });
            await sourceService.cache.set(cacheKey, finalResponse, sourceService.cacheTTL.sources);
            return finalResponse;
        })();

        inFlightRequests.set(cacheKey, scrapePromise);
        try {
            return await scrapePromise;
        } finally {
            inFlightRequests.delete(cacheKey);
            if (!backgroundHarvesterActive) {
                const listeners = sseListeners.get(cacheKey);
                if (listeners && listeners.size > 0) {
                    for (const l of listeners) {
                        try { l({ type: 'done', data: { status: 'complete' } }); } catch {}
                    }
                }
            }
        }
    }

    const isLiveChannelRequest = (id: string): boolean => {
        const str = String(id || '').trim().toLowerCase();
        return !/^\d{1,20}$/.test(str);
    };

    const resolveDirectIptvSource = async (type: 'movie' | 'tv', id: string) => {
        const publicBaseUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
        const iptvProvider = sourceService.registry.getProviders().find((p: any) => p.id === 'iptvsports');
        if (!iptvProvider) {
            throw OMSSErrors.invalidTmdbId(id);
        }
        const mediaObj = {
            tmdbId: id,
            imdbId: '',
            title: id,
            type,
            year: new Date().getFullYear(),
            season: 1,
            episode: 1,
            s: 1,
            e: 1
        };
        const res = type === 'movie'
            ? await iptvProvider.getMovieSources(mediaObj)
            : await iptvProvider.getTVSources(mediaObj);
        if (!res || !Array.isArray(res.sources) || res.sources.length === 0) {
            throw OMSSErrors.noSourcesAvailable(id, 1);
        }
        const built = sourceService.buildResponse([res]);
        built.sources = formatAndNamespaceSources(built.sources, publicBaseUrl);
        return built;
    };

    // Override getMovieSources
    sourceService.getMovieSources = async function (tmdbId: string) {
        if (isLiveChannelRequest(tmdbId)) {
            return await resolveDirectIptvSource('movie', tmdbId);
        }
        await sourceService.tmdbValidator.validateMovie(tmdbId);
        return await executeThreePillars('movie', tmdbId);
    };

    // Override getTVSources
    sourceService.getTVSources = async function (tmdbId: string, season: number, episode: number) {
        if (isLiveChannelRequest(tmdbId)) {
            return await resolveDirectIptvSource('tv', tmdbId);
        }
        await sourceService.tmdbValidator.validateTVEpisode(tmdbId, season, episode);
        return await executeThreePillars('tv', tmdbId, season, episode);
    };

    console.log('[ThreePillars] Three-Pillar Architecture successfully mounted on OMSS SourceService!');
}
