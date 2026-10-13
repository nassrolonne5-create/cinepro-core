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

    // Tier 1: Fast direct scrapers (trendimovies, videasy, rivestream, embedsu, vidlink, vidgod, cinesu, lmscript, icefy, cinemaarmy, purstream, sflix, superstream, vidfast, watchflix, vidvault, vidsrcwin, vixsrc, cinecat, vidrock, vidzee)
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
            url.endsWith('.txt') ||
            url.includes('.txt?')
        ) return false;

        // Promotional teaser / sample short videos
        if (
            url.includes('aoneroom.com') ||
            url.includes('animanga.fun') ||
            url.includes('tiktoks') ||
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
        const provId = typeof src.provider === 'object' && src.provider?.id ? src.provider.id : provBase.toLowerCase().replace(/[^a-z0-9]/g, '');
        src.provider = {
            name: formattedServer,
            id: provId.includes(serverSlug) ? provId : `${provId}-${serverSlug}`
        };

        if (src.type === 'mkv') {
            src.type = 'mp4';
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
                    recordProviderSuccess(provider.id);
                    console.log(`[ThreePillars] Provider '${provider.name}' returned ${res.sources.length} server(s) in ${elapsed}ms`);
                    if (onSourceFound) {
                        onSourceFound(res);
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

        // 1. CACHE CHECK: Instant response if already cached (< 5ms)
        const cached = await sourceService.cache.get(cacheKey);
        if (cached && Array.isArray(cached.sources) && cached.sources.length > 0) {
            console.log(`[ThreePillars] Cache HIT for ${cacheKey} (${cached.sources.length} sources)`);
            return cached;
        }

        // 2. SINGLE-FLIGHT COALESCING: Avoid concurrent duplicate scrapes for same movie/show
        if (inFlightRequests.has(cacheKey)) {
            console.log(`[ThreePillars] Joining in-flight scrape for ${cacheKey}`);
            return await inFlightRequests.get(cacheKey)!;
        }

        const scrapePromise = (async () => {
            console.log(`[ThreePillars] Cache MISS for ${cacheKey}. Executing Three-Pillar Tiered Strategy.`);
            const media = type === 'movie'
                ? await sourceService.tmdbService.getMediaObject('movie', id)
                : await sourceService.tmdbService.getMediaObject('tv', id, season, episode);
            media.imdbId = (await sourceService.tmdbService.getImdbId(id, type)) ?? '';

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

            // Prioritize WatchFlix and top-tier direct scrapers first to avoid socket starvation
            tier1Providers.sort((a, b) => {
                if (a.id === 'watchflix') return -1;
                if (b.id === 'watchflix') return 1;
                return 0;
            });

            console.log(`[ThreePillars] Partitioned ${allProviders.length} providers: Tier 1 (${tier1Providers.length} fast), Tier 2 (${tier2Providers.length} deep)`);

            // Shared collector for progressive results across all workers
            const sharedResults: any[] = [];

            const onProviderCompleted = async (completedResult: any) => {
                if (!completedResult || !Array.isArray(completedResult.sources) || completedResult.sources.length === 0) return;
                if (!sharedResults.includes(completedResult)) {
                    sharedResults.push(completedResult);
                }
                try {
                    const current = await sourceService.cache.get(cacheKey);
                    if (current && Array.isArray(current.sources)) {
                        sanitizeSharedResults([completedResult]);
                        const namespaced = formatAndNamespaceSources(completedResult.sources, publicBaseUrl);
                        const merged = mergeSources(current.sources || [], namespaced);
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
            };

            const getProviderTimeout = (p: any, tier: ProviderTier) => {
                if (p.id === 'watchflix') return 6000;
                return tier === ProviderTier.TIER_1_INSTANT ? 3500 : 6000;
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

            // Launch Tier 1 providers (concurrency 10 to protect network socket limits) and Tier 2 (concurrency 6)
            const tier1Promise = runWithConcurrencyLimit(tier1Tasks, 10);
            const tier2Promise = runWithConcurrencyLimit(tier2Tasks, 6);

            // Fast delivery trigger: wait up to 3000ms OR until Tier 1 finishes
            let fastTimerResolved = false;
            const fastDeliveryTimer = new Promise<void>((resolve) => {
                setTimeout(() => {
                    fastTimerResolved = true;
                    resolve();
                }, 3000);
            });

            await Promise.race([tier1Promise, fastDeliveryTimer]);

            // Check what we have collected so far
            sanitizeSharedResults(sharedResults);
            let initialResponse = sourceService.buildResponse(sharedResults.filter(Boolean));
            initialResponse.sources = formatAndNamespaceSources(initialResponse.sources, publicBaseUrl);

            // If we have >= 3 sources, deliver FAST initial batch to the user!
            if (initialResponse.sources.length >= 3) {
                console.log(`[ThreePillars] FAST DELIVERY SUCCESS! Delivering ${initialResponse.sources.length} servers in ~3.0s for ${cacheKey}`);

                sourceService.storeResponseIdMapping(initialResponse.responseId, {
                    cacheKey,
                    type,
                    tmdbId: id,
                    season,
                    episode,
                    createdAt: Date.now()
                });
                await sourceService.cache.set(cacheKey, initialResponse, sourceService.cacheTTL.sources);

                // Start detached background harvester to wait for the rest and hydrate cache to 50-70+ servers
                (async () => {
                    try {
                        console.log(`[ThreePillars] Background Harvester waiting for remaining providers on ${cacheKey}...`);
                        await Promise.allSettled([tier1Promise, tier2Promise]);

                        // Give multi-hop scrapers up to 2.5s extra if WatchFlix is still in-flight
                        const wfPresent = () => sharedResults.some((r: any) => r?.sources?.some((s: any) => s.provider?.id === 'watchflix' || s.server?.toLowerCase().includes('watchflix')));
                        if (!wfPresent()) {
                            await new Promise(r => setTimeout(r, 2500));
                        }

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
                    }
                })().catch(() => {});

                return initialResponse;
            }

            // Fallback: If fewer than 3 sources were ready, wait for Tier 1 to completely finish
            console.log(`[ThreePillars] Fast batch had only ${initialResponse.sources.length} servers. Awaiting full Tier 1 resolution...`);
            await tier1Promise;

            sanitizeSharedResults(sharedResults);
            const t1FullResponse = sourceService.buildResponse(sharedResults.filter(Boolean));
            t1FullResponse.sources = formatAndNamespaceSources(t1FullResponse.sources, publicBaseUrl);

            if (t1FullResponse.sources.length >= 3) {
                console.log(`[ThreePillars] Tier 1 full delivery: ${t1FullResponse.sources.length} servers for ${cacheKey}`);
                sourceService.storeResponseIdMapping(t1FullResponse.responseId, {
                    cacheKey,
                    type,
                    tmdbId: id,
                    season,
                    episode,
                    createdAt: Date.now()
                });
                await sourceService.cache.set(cacheKey, t1FullResponse, sourceService.cacheTTL.sources);

                // Background hydrate Tier 2
                (async () => {
                    await tier2Promise;
                    sanitizeSharedResults(sharedResults);
                    const fullResponse = sourceService.buildResponse(sharedResults.filter(Boolean));
                    fullResponse.sources = formatAndNamespaceSources(fullResponse.sources, publicBaseUrl);
                    const currentCached = (await sourceService.cache.get(cacheKey)) || t1FullResponse;
                    const mergedSources = mergeSources(currentCached.sources || [], fullResponse.sources);
                    const enriched = { ...currentCached, sources: mergedSources };
                    await sourceService.cache.set(cacheKey, enriched, sourceService.cacheTTL.sources);
                    console.log(`[ThreePillars] Background Tier 2 complete for ${cacheKey}: cache enriched to ${mergedSources.length} servers.`);
                })().catch(() => {});

                return t1FullResponse;
            }

            // Ultimate Fallback: Wait for Tier 2 deep aggregators
            console.log(`[ThreePillars] Awaiting Tier 2 deep aggregators...`);
            await tier2Promise;

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
        }
    }

    // Override getMovieSources
    sourceService.getMovieSources = async function (tmdbId: string) {
        await sourceService.tmdbValidator.validateMovie(tmdbId);
        return await executeThreePillars('movie', tmdbId);
    };

    // Override getTVSources
    sourceService.getTVSources = async function (tmdbId: string, season: number, episode: number) {
        await sourceService.tmdbValidator.validateTVEpisode(tmdbId, season, episode);
        return await executeThreePillars('tv', tmdbId, season, episode);
    };

    console.log('[ThreePillars] Three-Pillar Architecture successfully mounted on OMSS SourceService!');
}
