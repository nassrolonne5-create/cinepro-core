# WatchFlix Multi-Server Restoration & Tier 1 Architecture Tuning

Restore full WatchFlix server availability (Supreme, Prime, Orbit, Horizon, and Premiere 4K) into CinePro Core by optimizing upstream VidCore handshake token extraction, tuning Tier 1 concurrency race timeouts, and ensuring resilient background cache hydration without blocking other providers.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed based on your responses:

- **Confirmed Decision 1 (Server Coverage)**: Return all healthy extracted WatchFlix servers (Supreme, Prime, Orbit, Horizon, and Premiere 4K) to the client with distinct server labels and clean proxy routing.
- **Confirmed Decision 2 (Scheduling & Concurrency)**: Keep WatchFlix in the Tier 1 Parallel Race with optimized, lightweight token extraction and a tailored 5000ms deadline so multi-hop handshakes succeed while fast providers still deliver initial results in under 3.0 seconds.
- **Confirmed Decision 3 (Failure Resilience)**: If upstream VidCore or encryption handshakes are temporarily unreachable or throttled, smoothly fall back to the secondary VidVault HD mirror nodes and existing cache without triggering premature circuit breaker lockouts or blocking other provider streams.

---

### 1. Overview & Core Concept

- **What It Does**: Resolves movies and TV series across all active WatchFlix upstream nodes (Supreme, Prime, Orbit, Horizon, and Premiere 4K) alongside CinePro's other high-performance scrapers (TrendiMovies, CineCat, CineSu, EmbedSU, VidZee, etc.), delivering clean, proxied `.m3u8` and `.mp4` streams.
- **Target Audience / Persona**: Media client applications (CinePro web player, Android TV / mobile apps, Kodi, Stremio) requesting low-latency stream sources with multi-source redundancy.
- **Key Value**: Eliminates the "missing WatchFlix" gap, restores multi-server English FHD/4K playback options, and maintains sub-3-second initial API delivery speeds through progressive background hydration.

---

### 2. User Experience & Visual Design

*Note: CinePro Core is an API service delivering JSON streaming payloads to frontend video clients.*

- **Key User Flows**:
  1. **Instant Search / Stream Selection**: Client requests `/v1/movies/:id` or `/v1/tv/:id/seasons/:s/episodes/:e`.
  2. **Fast Initial Delivery (< 3.0s)**: API delivers the first wave of ready sources (CineCat, TrendiMovies, EmbedSU, etc.) with unique server identifiers.
  3. **Progressive Background Hydration**: In the background, WatchFlix's multi-step VidCore resolution completes (within ~3.5s - 4.5s) and immediately hydrates the cache with Supreme, Prime, Orbit, and Horizon nodes.
  4. **Instant Subsequent Playback (< 5ms)**: Repeat queries or player switches hit memory cache instantly with 15–30+ aggregated, deduplicated servers.
- **Payload & Labeling Identity**:
  - Consistent server branding: `WatchFlix (Supreme)`, `WatchFlix (Prime)`, `WatchFlix (Orbit)`, `WatchFlix (Horizon)`.
  - Normalized stream types: standard HLS (`hls`) or MP4 (`mp4`) with English audio track tags and high-priority ranking.
  - Transparent stream proxying via `/v1/proxy/video.mp4` with origin and referer preservation.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Upstream VidCore Pipeline Optimization vs. Blind Timeout Bumping**
  - *Chosen Approach*: Streamline the 7-step VidCore pipeline in `watchflix.ts` (efficient regex extraction, concurrent decryption of top healthy servers via `Promise.allSettled`, and shared keep-alive headers), while increasing the Tier 1 per-provider timeout from 3500ms to 5000ms specifically for multi-hop providers.
  - *Why*: The original 3500ms Tier 1 cutoff caused WatchFlix to be killed right before server decryption finished (~3600ms - 4100ms), which registered false failures with the circuit breaker and dropped the servers entirely.
  - *Alternatives Considered*: Moving WatchFlix to Tier 2 was considered, but keeping it in the Tier 1 parallel race allows it to compete directly and be ready within the initial fast response window whenever upstream network latency is low.

- **Decision 2: Comprehensive Multi-Server Extraction (Supreme, Prime, Orbit, Horizon)**
  - *Chosen Approach*: Expand `targetServers` in `watchflix.ts` from `servers.slice(0, 3)` to all healthy server nodes (`servers.filter(s => s && s.data).slice(0, 5)`).
  - *Why*: Satisfies user requirement to expose all active servers rather than restricting users to a hardcoded trio.

- **Decision 3: Non-Blocking Background Harvester Integration**
  - *Chosen Approach*: Ensure the detached background harvester in `threePillars.ts` continues running the full provider promise even after the 3000ms fast delivery timer fires, successfully writing WatchFlix servers into the cache alongside the initial batch.
  - *Why*: Users get instant initial playback while preserving complete server variety for subsequent requests or alternate server selections.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CinePro Core API Request                        │
│             GET /v1/movies/:id  or  GET /v1/tv/:id/seasons/s/episodes/e│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         [ Cache Check (<5ms) ]
                                    │
                    MISS ───────────┴─────────── HIT ──> Instant Cached Response
                    │
┌───────────────────▼────────────────────────────────────────────────────┐
│                    Three-Pillar Tiered Engine                          │
│                                                                        │
│   ┌───────────────────────────┐      ┌───────────────────────────────┐ │
│   │ Tier 1: Lightning Scrapers│      │ Tier 2: Deep Aggregators      │ │
│   │ • TrendiMovies, CineCat   │      │ • VidNest, VidUp, VidSrc      │ │
│   │ • WatchFlix (VidCore 5.0s)│      │   (6000ms limit)              │ │
│   │   (Concurrency: 20)       │      │   (Concurrency: 6)            │ │
│   └─────────────┬─────────────┘      └──────────────┬────────────────┘ │
└─────────────────┼───────────────────────────────────┼──────────────────┘
                  │                                   │
       Fast Timer (3.0s)                              │
                  ▼                                   │
┌──────────────────────────────────┐                  │
│ Initial Fast Delivery (≥3 nodes) │                  │
│ • Returns immediate streams      │                  │
└─────────────────┬────────────────┘                  │
                  │ (Detached Background Harvester)   │
                  ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│    WatchFlix Resolution Pipeline (`watchflix.ts`):                     │
│    1. GET vidcore.io/movie/:id or /tv/:id/:s/:e                        │
│    2. Extract "en" token via resilient regex                           │
│    3. Handshake Stage 1 + Stage 2 via enc-dec.app API                  │
│    4. Fetch & Decrypt Servers list                                     │
│    5. Concurrent Decrypt: Supreme, Prime, Orbit, Horizon, Premiere 4K  │
│    6. Fallback to VidVault HD if VidCore unreachable                   │
│                                                                        │
│    Cache Hydration: Merges WatchFlix into cache for instant playback   │
└────────────────────────────────────────────────────────────────────────┘
```

- **Core Module Updates**:
  1. `src/providers/watchflix/watchflix.ts`:
     - TV routing parameter normalization (`media.s || media.season || 1`, `media.e || media.episode || 1`).
     - Resilient regex for token extraction matching escaped and unescaped JSON variants.
     - Multi-server mapping supporting Supreme, Prime, Orbit, Horizon, and Premiere 4K.
     - Secondary VidVault mirror fallback when VidCore yields 0 servers or connection errors.
  2. `src/threePillars.ts`:
     - Dynamic provider timeout allocation (5000ms budget for multi-hop providers in Tier 1).
     - Safeguarded circuit breaker logic ensuring slow-but-successful scrapers do not increment failure counters.
     - Background harvester cache merge validation for WatchFlix source persistence.
