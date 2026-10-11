# Embeddable Live TV Section & Hls.js Player for NotflixTV (`notflixtv.com`)

Deliver a high-performance, dark-themed **Live TV section** for `notflixtv.com` that connects directly to CinePro Core's new IPTV scraper API (`/v1/iptv/channels`, `/v1/iptv/stream/:channelId`, and `/v1/iptv/playlist.m3u`), featuring a zero-latency Hls.js video player, categorized channel sidebar, and single-file drop-in embed code.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed based on your selections:

- **Delivery Mechanism**: Pre-built, self-contained embeddable web player and channel guide page hosted directly by CinePro Core (`/livetv` or `/v1/iptv/embed`), complete with responsive iframe and script tags for seamless integration into `notflixtv.com`.
- **Playback Engine**: Native HTML5 `<video>` powered by `Hls.js` (v1.5+) with automatic adaptive bitrate (ABR) switching, recovery handlers for network stalls, and zero third-party player dependencies.
- **Interface Layout**: Desktop sidebar navigation ($320\text{px}$ channel drawer) with an instant full-screen main video player on the right, collapsing into a bottom-drawer zapper on mobile.
- **Audio & Stream Normalization**: All streams route through CinePro's `/v1/proxy` relay with custom spoofed headers to bypass CORS, hotlinking blocks, and mixed-content security errors on `notflixtv.com`.

---

## 1. Overview & Core Concept

### What It Does
Provides `notflixtv.com` with a complete, turn-key **Live TV experience**:
1. **Direct Integration**: Embeds into `notflixtv.com` via a single `<iframe src="https://<cinepro-url>/livetv" />` or drop-in web component.
2. **Instant Channel Zapping**: Users click any sports channel (**beIN Sports 1–5 & USA**, **Sky Sports Premier League/F1**, **TNT Sports**, **ESPN**) or broadcast network (**NBC**, **CBS**, **ABC**, **FOX**), and the player tunes in within milliseconds without reloading the page.
3. **CORS & Token Autonomy**: CinePro Core's proxy server relays TS video segments and M3U8 playlists transparently so `notflixtv.com` never triggers browser security blocks or geo-IP rejections.

### Target Audience & Persona
Visitors of `notflixtv.com` who want to switch from on-demand movies and series to live sports matches, breaking news, or late-night talk shows in real time without leaving the site.

### Key Value
- **Zero Configuration on NotflixTV**: No need to install complex IPTV backend code on `notflixtv.com`—all channel health monitoring, stream decryption, and manifest proxying remain isolated inside CinePro Core.
- **100% Reliable Playback**: Native Hls.js configuration with automatic retry buffers, smooth audio track pairing, and responsive aspect-ratio containment.

---

## 2. User Experience & Visual Design

### Key User Flows

#### Flow 1: Channel Discovery & Instant Playback
```
[User Visits notflixtv.com/livetv]
               │
               ▼
┌──────────────────────────────────────────────┐
│  Loads Live TV Section:                       │
│  - Default Channel: beIN Sports 1 (HD)       │
│  - Hls.js initiates instant playback         │
└──────────────────────┬───────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
[Browse Sports Channels]       [Switch to US Broadcast]
  - Sky Sports Premier League     - NBC Live (Fallon)
  - TNT Sports 1                  - CBS Live (Colbert)
  - ESPN USA                      - ABC Live (Kimmel)
       │                               │
       └───────────────┬───────────────┘
                       ▼
[Click Channel -> Player Zaps Stream in <300ms]
```

### Visual Identity & Theme
- **Color Palette & Atmosphere**:
  - Background: Deep cinematic slate (`#0B0E14` / `bg-neutral-950`) matching `notflixtv.com`'s dark UI.
  - Sidebar Surface: Subtle elevation (`#121721` / `border-neutral-800/80`).
  - Brand & Accent: Vibrant neon crimson/emerald indicators (`#E50914` live badge, `#10B981` active stream pulse).
  - Text Hierarchy: Crisp white headlines (`text-neutral-100`), muted metadata (`text-neutral-400` with subtle dot separators).
- **Typography**: Clean modern sans-serif (`Inter`, `system-ui`) with tabular figures (`font-variant-numeric: tabular-nums`) for timestamps and stream bitrates.
- **Anti-Slop Discipline**: No garish candy pill badges; channel categories rendered via functional segmented buttons (`All`, `Sports`, `Broadcast`), and channel statuses displayed as minimalist pulsing status rings.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Standalone Route (`/livetv`) on CinePro Core**
  - *Chosen Approach*: Host the complete Live TV web application directly on CinePro Core under `GET /livetv`, allowing `notflixtv.com` to either embed it as an iframe or fetch the underlying JSON API (`/v1/iptv/channels` and `/v1/iptv/stream/:id`).
  - *Why*: Gives you immediate plug-and-play capability today without requiring redeployment of `notflixtv.com`'s entire server stack.
- **Decision 2: Hls.js Direct Integration vs Heavy Video Players**
  - *Chosen Approach*: Lightweight vanilla Hls.js with custom HTML5 video controls over heavy frameworks like Video.js or Plyr.
  - *Why*: Drastically lowers memory footprint, loads in $<100\text{ms}$, eliminates iframe lag, and delivers hardware-accelerated MSE decoding on both mobile and desktop browsers.
- **Decision 3: Server-Side Proxied M3U8 vs Raw Edge URLs**
  - *Chosen Approach*: All streams route through CinePro's `/v1/proxy` relay with automatic User-Agent and Referer spoofing.
  - *Why*: Live sports streams (beIN, Sky, TNT) strictly enforce origin and referer checks. The proxy relay bypasses CORS, hotlink protection, and browser mixed-content blocks.

---

## 4. Technical Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NOTFLIXTV.COM FRONTEND                          │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               <iframe src="https://api.../livetv">             │   │
│   │                                                                │   │
│   │   ┌───────────────────────────┐  ┌─────────────────────────┐   │   │
│   │   │   Main Video Player View  │  │ Channel Sidebar Drawer  │   │   │
│   │   │   - Native HTML5 Video    │  │ - Search & Category Tab │   │   │
│   │   │   - Hls.js Engine         │  │ - beIN Sports 1-5 & USA │   │   │
│   │   │   - Live Badge & Bitrate  │  │ - Sky Sports & TNT & F1 │   │   │
│   │   │   - Audio/Fullscreen Bar  │  │ - NBC/CBS/ABC Broadcast │   │   │
│   │   └─────────────▲─────────────┘  └────────────┬────────────┘   │   │
│   └─────────────────┼─────────────────────────────┼────────────────┘   │
└─────────────────────┼─────────────────────────────┼────────────────────┘
                      │                             │
                      │ Play Stream                 │ Fetch Directory
                      │                             ▼
┌─────────────────────┼───────────────────┬──────────────────────────────┐
│                     │                   ▼                              │
│                     │       GET /v1/iptv/channels                      │
│                     ▼                                                  │
│         GET /v1/iptv/stream/:channelId                                 │
│                     │                                                  │
│                     ▼                                                  │
│         GET /v1/proxy?data=<encoded>&ext=.m3u8                         │
│                     │                                                  │
│                     ▼                                                  │
│         CINEPRO CORE PROXY RELAY (Spoofs Headers & Relays Segments)     │
└─────────────────────┬──────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        LIVE SPORTS & BROADCAST CDNs                    │
│          beIN Sports, Sky UK, TNT Sports, ESPN, NBC Live feeds         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Steps

1. **Live TV Web Application Endpoint (`src/server.ts` & `src/views/livetv.html`)**:
   - Create a dedicated route `GET /livetv` on CinePro Core serving a complete, responsive Live TV single-page app.
   - Include modern CDN bundle for `Hls.js` (lightweight, zero build step required).
   - Implement the channel sidebar with instant search, category filtering (`Sports`, `Broadcast`, `All`), and active channel indicators.
   - Connect playback directly to `/v1/iptv/stream/:channelId`.

2. **Integration Assets for `notflixtv.com`**:
   - Provide clean, copy-paste embed code snippet (`<iframe>` and standalone React/HTML component) ready to drop into `notflixtv.com`.
   - Ensure responsive resizing (`w-full aspect-video` or full-height split screen) with touch swipe navigation for mobile devices.

3. **CORS & Proxy Optimization**:
   - Ensure `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Methods: GET, OPTIONS` headers are present on all `/v1/iptv/*` routes so `notflixtv.com` can also call the API directly via `fetch()` if desired.
   - Add automatic error recovery in `Hls.js` (`hls.recoverMediaError()`, `hls.startLoad()`) for smooth failover if a stream drops a segment.

4. **Verification & Testing**:
   - Test loading `/livetv` in desktop and mobile viewport sizes.
   - Test channel switching across beIN Sports 1, Sky Sports Premier League, TNT Sports, and NBC Live.
   - Verify iframe embed code on an external domain to confirm zero CORS or mixed-content errors.
