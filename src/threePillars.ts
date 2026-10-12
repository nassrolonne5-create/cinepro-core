import { OMSSErrors } from '@omss/framework';
import crypto from 'node:crypto';

export enum ProviderTier {
    TIER_1_INSTANT = 1,  // Lightning direct scrapers (timeout 3500ms)
    TIER_2_STANDARD = 2, // Standard JSON/HTML scrapers (timeout 6000ms)
    TIER_3_DEEP = 3      // Multi-stage / heavy aggregators (timeout 9000ms)
}

export function getProviderTier(providerId: string, providerName: string): ProviderTier {
    const id = (providerId || '').toLowerCase();
    const name = (providerName || '').toLowerCase();

    // Tier 1: Fastest direct API/streaming scrapers
    if (
        id.includes('vidfast') || name.includes('vidfast') ||
        id.includes('cinemaarmy') || name.includes('cinemaarmy') ||
        id.includes('cinecat') || name.includes('cinecat') ||
        id.includes('vidvault') || name.includes('vidvault') ||
        id.includes('vidsrcwin') || name.includes('vidsrcwin') ||
        id.includes('rivestream') || name.includes('rivestream') ||
        id.includes('vidgod') || name.includes('vidgod') ||
        id.includes('vixsrc') || name.includes('vixsrc')
    ) {
        return ProviderTier.TIER_1_INSTANT;
    }

    // Tier 3: Deep aggregators / multi-hop / heavy fallbacks
    if (
        id.includes('consumet') || name.includes('consumet') ||
        id.includes('sflix') || name.includes('sflix') ||
        id.includes('videasy') || name.includes('videasy') ||
        id.includes('vidup') || name.includes('vidup') ||
        id.includes('talkshow') || name.includes('talkshow') ||
        id.includes('stremio') || name.includes('stremio') ||
        id.includes('mapple') || name.includes('mapple') ||
        id.includes('subtitles') || name.includes('subtitles') ||
        id.includes('lmscript') || name.includes('lmscript')
    ) {
        return ProviderTier.TIER_3_DEEP;
    }

    // Tier 2: Standard stable scrapers (vidnest, purstream, cinesu, superstream, icefy, trendimovies, vidlink, vidrock, vidzee, watchflix, etc.)
    return ProviderTier.TIER_2_STANDARD;
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
// PILLAR 1: Concurrency Limiter
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
// PILLAR 3: Universal Namespacing & Sanitization
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
    for (const s of targetSources) {
        const key = (s.url || '') + '_' + (s.provider?.id || s.server || '');
        map.set(key, s);
    }
    for (const s of newSources) {
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
// Background harvester deduplication
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

    const originalGetMovieSources = sourceService.getMovieSources.bind(sourceService);
    const originalGetTVSources = sourceService.getTVSources.bind(sourceService);

    // Helper to scrape a single provider safely with per-tier timeout and circuit breaker
    async function scrapeProviderSafely(provider: any, type: 'movie' | 'tv', media: any, timeoutMs: number) {
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

            const scrapePromise = type === 'movie' 
                ? provider.getMovieSources(media) 
                : provider.getTVSources(media);

            const result = await Promise.race([scrapePromise, timeoutPromise]);
            const elapsed = Date.now() - t0;

            if (result && Array.isArray(result.sources)) {
                if (result.sources.length > 0) {
                    recordProviderSuccess(provider.id);
                    console.log(`[ThreePillars] Provider '${provider.name}' returned ${result.sources.length} server(s) in ${elapsed}ms`);
                }
                return result;
            }
            return { sources: [], subtitles: [], diagnostics: [] };
        } catch (err: any) {
            recordProviderFailure(provider.id);
            const elapsed = Date.now() - t0;
            console.warn(`[ThreePillars] Provider '${provider.name}' failed in ${elapsed}ms: ${err?.message || 'Error'}`);
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    // Background harvester that executes remaining providers and hydrates cache
    async function runBackgroundHarvest(
        type: 'movie' | 'tv',
        media: any,
        cacheKey: string,
        initialResponse: any,
        providersToScrape: any[]
    ) {
        if (activeHarvesters.has(cacheKey)) return;
        activeHarvesters.add(cacheKey);

        try {
            console.log(`[ThreePillars] Background Harvester started for ${cacheKey} (${providersToScrape.length} pending providers)`);
            const publicBaseUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

            // Run deep providers with concurrency limit 4 and 8500ms timeout
            const tasks = providersToScrape.map(provider => () => 
                scrapeProviderSafely(provider, type, media, 8500)
            );
            const results = await runWithConcurrencyLimit(tasks, 4);

            // Also scrape Stremio addons if available
            let stremioResult: any = null;
            if (sourceService.stremioService?.hasEnabledAddons()) {
                try {
                    stremioResult = type === 'movie'
                        ? await sourceService.stremioService.getMovieSources(media)
                        : await sourceService.stremioService.getTVSources(media);
                } catch {}
            }

            const allHarvested = results.filter(Boolean);
            if (stremioResult && Array.isArray(stremioResult.sources)) {
                allHarvested.push(stremioResult);
            }

            // Build response for harvested results
            const harvestedResponse = sourceService.buildResponse(allHarvested);
            const formattedHarvestedSources = formatAndNamespaceSources(harvestedResponse.sources, publicBaseUrl);

            // Fetch current cache (in case earlier updates happened)
            const currentCached = (await sourceService.cache.get(cacheKey)) || initialResponse;
            const mergedSources = mergeSources(currentCached.sources || [], formattedHarvestedSources);
            const mergedSubs = mergeSubtitles(currentCached.subtitles || [], harvestedResponse.subtitles || []);

            const fullResponse = {
                ...currentCached,
                sources: mergedSources,
                subtitles: mergedSubs,
                diagnostics: [...(currentCached.diagnostics || []), ...(harvestedResponse.diagnostics || [])]
            };

            // Update cache with full enriched set
            await sourceService.cache.set(cacheKey, fullResponse, sourceService.cacheTTL.sources);
            console.log(`[ThreePillars] Background Harvester completed for ${cacheKey}. Servers expanded from ${initialResponse?.sources?.length || 0} to ${mergedSources.length}!`);
        } catch (err: any) {
            console.error(`[ThreePillars] Background Harvester error for ${cacheKey}:`, err?.message);
        } finally {
            activeHarvesters.delete(cacheKey);
        }
    }

    // Core Progressive Engine
    async function executeThreePillars(type: 'movie' | 'tv', id: string, season?: number, episode?: number) {
        const cacheKey = type === 'movie' ? `movie:${id}` : `tv:${id}:s${season}:e${episode}`;
        const publicBaseUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

        // 1. CACHE CHECK
        const cached = await sourceService.cache.get(cacheKey);
        if (cached && Array.isArray(cached.sources) && cached.sources.length > 0) {
            console.log(`[ThreePillars] Cache HIT for ${cacheKey} (${cached.sources.length} sources)`);
            // If cache is partial (e.g. fewer than 22 servers), trigger background refresh to gather all 70+
            if (cached.sources.length < 22 && !activeHarvesters.has(cacheKey)) {
                const media = type === 'movie'
                    ? await sourceService.tmdbService.getMediaObject('movie', id)
                    : await sourceService.tmdbService.getMediaObject('tv', id, season, episode);
                media.imdbId = (await sourceService.tmdbService.getImdbId(id, type)) ?? '';
                const providers = sourceService.registry.getProviders()
                    .filter((p: any) => p.capabilities.supportedContentTypes.includes(type === 'movie' ? 'movies' : 'tv'))
                    .filter((p: any) => p.enabled);
                runBackgroundHarvest(type, media, cacheKey, cached, providers);
            }
            return cached;
        }

        // 2. SINGLE-FLIGHT COALESCING
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
            const tier3Providers: any[] = [];

            for (const p of allProviders) {
                const tier = getProviderTier(p.id, p.name);
                if (tier === ProviderTier.TIER_1_INSTANT) tier1Providers.push(p);
                else if (tier === ProviderTier.TIER_2_STANDARD) tier2Providers.push(p);
                else tier3Providers.push(p);
            }

            console.log(`[ThreePillars] Providers partitioned: Tier 1 (${tier1Providers.length}), Tier 2 (${tier2Providers.length}), Tier 3 (${tier3Providers.length})`);

            // Execute Tier 1 (Fast direct scrapers, max concurrency 6, timeout 3500ms)
            const tier1Tasks = tier1Providers.map(p => () => scrapeProviderSafely(p, type, media, 3500));
            // Start Tier 2 immediately in parallel (max concurrency 5, timeout 5500ms)
            const tier2Tasks = tier2Providers.map(p => () => scrapeProviderSafely(p, type, media, 5500));

            const tier1Promise = runWithConcurrencyLimit(tier1Tasks, 6);
            const tier2Promise = runWithConcurrencyLimit(tier2Tasks, 5);

            // Fast-Delivery Window: 2400ms
            const fastCutoffPromise = new Promise<{ isCutoff: true }>((resolve) => {
                setTimeout(() => resolve({ isCutoff: true }), 2400);
            });

            // Wait for Tier 1 or cutoff
            const earlyResult = await Promise.race([
                tier1Promise.then(res => ({ isCutoff: false as const, res })),
                fastCutoffPromise
            ]);

            let initialResults: any[] = [];
            if (!earlyResult.isCutoff) {
                initialResults = earlyResult.res;
            } else {
                // Cutoff reached: collect whatever Tier 1 and Tier 2 have resolved so far
                initialResults = (await Promise.race([
                    tier1Promise,
                    new Promise<any[]>(r => setTimeout(() => r([]), 150))
                ])) || [];
            }

            const initialResponse = sourceService.buildResponse(initialResults.filter(Boolean));
            initialResponse.sources = formatAndNamespaceSources(initialResponse.sources, publicBaseUrl);

            // If Tier 1 returned verified servers (e.g. >= 3 servers), DELIVER IMMEDIATELY!
            if (initialResponse.sources.length >= 3) {
                console.log(`[ThreePillars] FAST DELIVERY SUCCESS! Returning ${initialResponse.sources.length} servers in ~2.5s for ${cacheKey}`);

                // Store mapping & Cache initial set
                sourceService.storeResponseIdMapping(initialResponse.responseId, {
                    cacheKey,
                    type,
                    tmdbId: id,
                    season,
                    episode,
                    createdAt: Date.now()
                });
                await sourceService.cache.set(cacheKey, initialResponse, sourceService.cacheTTL.sources);

                // Asynchronously harvest remaining Tier 2 & Tier 3 in background
                const remainingProviders = [...tier2Providers, ...tier3Providers];
                runBackgroundHarvest(type, media, cacheKey, initialResponse, remainingProviders);

                return initialResponse;
            }

            // Fallback: If Tier 1 yielded fewer than 6 servers (e.g. obscure title), wait for Tier 2 to finish
            console.log(`[ThreePillars] Fast batch had ${initialResponse.sources.length} servers. Awaiting Tier 2 completion...`);
            const tier2Results = await tier2Promise;
            const combinedResults = [...initialResults, ...tier2Results].filter(Boolean);
            const combinedResponse = sourceService.buildResponse(combinedResults);
            combinedResponse.sources = formatAndNamespaceSources(combinedResponse.sources, publicBaseUrl);

            // If we have sources now, deliver and kick off Tier 3 in background
            if (combinedResponse.sources.length > 0) {
                sourceService.storeResponseIdMapping(combinedResponse.responseId, {
                    cacheKey,
                    type,
                    tmdbId: id,
                    season,
                    episode,
                    createdAt: Date.now()
                });
                await sourceService.cache.set(cacheKey, combinedResponse, sourceService.cacheTTL.sources);
                runBackgroundHarvest(type, media, cacheKey, combinedResponse, tier3Providers);
                return combinedResponse;
            }

            // Ultimate Fallback: Wait for Tier 3
            console.log(`[ThreePillars] Awaiting Tier 3 deep aggregators...`);
            const tier3Tasks = tier3Providers.map(p => () => scrapeProviderSafely(p, type, media, 8000));
            const tier3Results = await runWithConcurrencyLimit(tier3Tasks, 3);
            const fullResults = [...combinedResults, ...tier3Results].filter(Boolean);
            const finalResponse = sourceService.buildResponse(fullResults);
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
