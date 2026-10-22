import { Readable } from 'node:stream';
import * as zlib from 'node:zlib';

export interface LiveStreamSource {
    id: string;
    server: string;
    url: string;
    rawUrl: string;
    quality: string;
    language: 'ar' | 'en' | 'fr' | 'es' | 'tr' | 'multi';
    languageLabel: string;
    type: 'hls';
    verified?: boolean;
    latencyMs?: number;
    headers?: Record<string, string>;
    audioTracks: Array<{ language: string; label: string }>;
    provider: {
        id: string;
        name: string;
    };
}

export interface LiveChannel {
    id: string;
    name: string;
    shortName: string;
    network: string;
    category:
        | 'bein'
        | 'fox'
        | 'espn'
        | 'sky'
        | 'europe'
        | 'mena'
        | 'usa'
        | 'combat'
        | 'motorsport'
        | 'movies'
        | 'entertainment';
    language: 'ar' | 'en' | 'fr' | 'es' | 'tr' | 'multi';
    languageLabel: string;
    country: string;
    logo: string;
    quality: string;
    featured: boolean;
    streams: Array<{
        label: string;
        url: string;
        quality: string;
        language: 'ar' | 'en' | 'fr' | 'es' | 'tr' | 'multi';
        headers?: Record<string, string>;
    }>;
}

export interface LiveSportEvent {
    id: string;
    title: string;
    shortTitle: string;
    sport: string;
    league: string;
    leagueSlug: string;
    leagueLogo?: string;
    startTime: string;
    status: 'LIVE' | 'UPCOMING' | 'FINISHED';
    statusDetail: string;
    homeTeam: {
        name: string;
        shortName: string;
        logo: string;
        score?: string;
    };
    awayTeam: {
        name: string;
        shortName: string;
        logo: string;
        score?: string;
    };
    broadcasts: string[];
    recommendedChannels: Array<{
        channelId: string;
        name: string;
        language: string;
        languageLabel: string;
        logo: string;
        streamEndpoint: string;
    }>;
}

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
const EDGE_CDN_BASE = 'https://edge.cowedd4855ws.sbs';
const DEMBED_HEADERS: Record<string, string> = {
    Origin: 'https://dembed.st',
    Referer: 'https://dembed.st/'
};
const TVNOW_HEADERS: Record<string, string> = {
    Referer: 'https://tvnow.st/'
};
const ROTANA_HEADERS: Record<string, string> = {
    Referer: 'https://rotana.net/'
};

/**
 * Curated Core Sports, beIN Sports & Movies/Entertainment Channel Matrix (AR / EN / FR / ES / TR + MENA + Global)
 * Strictly 1-to-1 channel mapping: every stream belongs exclusively to the named channel.
 */
export const CORE_SPORTS_CHANNELS: LiveChannel[] = [
    // =========================================================================
    // 1. beIN SPORTS — ARABIC (MENA)
    // =========================================================================
    {
        id: 'bein-sports-1-ar',
        name: 'beIN Sports 1 HD (Arabic)',
        shortName: 'beIN 1 AR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Sports 1 AR (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium91/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-2-ar',
        name: 'beIN Sports 2 HD (Arabic)',
        shortName: 'beIN 2 AR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Sports 2 AR (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium92/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-3-ar',
        name: 'beIN Sports 3 HD (Arabic)',
        shortName: 'beIN 3 AR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Sports 3 AR (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium93/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-4-ar',
        name: 'beIN Sports 4 HD (Arabic)',
        shortName: 'beIN 4 AR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/vwAgJNi.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Sports 4 AR (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium94/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-5-ar',
        name: 'beIN Sports 5 HD (Arabic)',
        shortName: 'beIN 5 AR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/2Rha5aY.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Sports 5 AR (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium95/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-6-ar',
        name: 'beIN Sports 6 HD (Arabic)',
        shortName: 'beIN 6 AR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/0wBdLYb.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports 6 AR (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium96/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-7-ar',
        name: 'beIN Sports 7 HD (Arabic)',
        shortName: 'beIN 7 AR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/iODFwZi.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports 7 AR (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium97/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-8-ar',
        name: 'beIN Sports 8 HD (Arabic)',
        shortName: 'beIN 8 AR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/CaFEyVn.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports 8 AR (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium98/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-9-ar',
        name: 'beIN Sports 9 HD (Arabic)',
        shortName: 'beIN 9 AR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://assets.bein.com/mena/sites/3/2023/09/logos-_beINSPORTS9.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports 9 AR (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium99/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-open-ar',
        name: 'beIN Sports HD Open / News (Arabic)',
        shortName: 'beIN Open AR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Sports HD Qatar (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium578/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-premium-1-ar',
        name: 'beIN Sports Premium 1 HD (Arabic)',
        shortName: 'beIN Premium 1 AR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Premium 1 AR (1080p)', url: `${EDGE_CDN_BASE}/premium91/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-premium-2-ar',
        name: 'beIN Sports Premium 2 HD (Arabic)',
        shortName: 'beIN Premium 2 AR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Premium 2 AR (1080p)', url: `${EDGE_CDN_BASE}/premium92/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-premium-3-ar',
        name: 'beIN Sports Premium 3 HD (Arabic)',
        shortName: 'beIN Premium 3 AR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Premium 3 AR (1080p)', url: `${EDGE_CDN_BASE}/premium93/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },

    // =========================================================================
    // 2. beIN SPORTS — ENGLISH (EN)
    // =========================================================================
    {
        id: 'bein-sports-xtra-en',
        name: 'beIN SPORTS XTRA HD (English)',
        shortName: 'beIN XTRA EN',
        network: 'beIN Sports',
        category: 'bein',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.ibb.co/HT49GPmB/XTRA-2.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN XTRA English (Amagi 1080p)', url: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', quality: '1080p', language: 'en' },
            { label: 'beIN XTRA English (Edge 1080p)', url: `${EDGE_CDN_BASE}/premium100/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN XTRA English (Tubi 1080p)', url: 'https://live-manifest.production-public.tubi.io/live/2fd3d156-b63c-47c8-9d04-5961ddd9cee8/playlist.m3u8', quality: '1080p', language: 'en' },
            { label: 'beIN XTRA English (LocalNow CDN)', url: 'https://amg01334-beinsportsllc-beinxtra-localnow-kcy6r.amagi.tv/playlist.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'bein-sports-en-1',
        name: 'beIN Sports 1 English HD',
        shortName: 'beIN 1 EN',
        network: 'beIN Sports',
        category: 'bein',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Sports USA English (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium425/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 1 English (Intl 1080p)', url: `${EDGE_CDN_BASE}/premium712/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-en-2',
        name: 'beIN Sports 2 English HD',
        shortName: 'beIN 2 EN',
        network: 'beIN Sports',
        category: 'bein',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Sports 2 English (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium713/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-en-3',
        name: 'beIN Sports 3 English HD',
        shortName: 'beIN 3 EN',
        network: 'beIN Sports',
        category: 'bein',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports 3 English (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium714/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },

    // =========================================================================
    // 3. beIN SPORTS — FRENCH (FR)
    // =========================================================================
    {
        id: 'bein-sports-fr-1',
        name: 'beIN Sports 1 France HD (FR)',
        shortName: 'beIN 1 FR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Sports 1 France (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium116/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-fr-2',
        name: 'beIN Sports 2 France HD (FR)',
        shortName: 'beIN 2 FR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Sports 2 France (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium117/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-fr-3',
        name: 'beIN Sports 3 France HD (FR)',
        shortName: 'beIN 3 FR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Sports 3 France (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium118/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-max-4-fr',
        name: 'beIN Sports MAX 4 France HD (FR)',
        shortName: 'beIN MAX 4 FR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/vwAgJNi.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports MAX 4 France (1080p)', url: `${EDGE_CDN_BASE}/premium494/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-max-5-fr',
        name: 'beIN Sports MAX 5 France HD (FR)',
        shortName: 'beIN MAX 5 FR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/2Rha5aY.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports MAX 5 France (1080p)', url: `${EDGE_CDN_BASE}/premium495/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-max-6-fr',
        name: 'beIN Sports MAX 6 France HD (FR)',
        shortName: 'beIN MAX 6 FR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/0wBdLYb.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports MAX 6 France (1080p)', url: `${EDGE_CDN_BASE}/premium496/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-max-7-fr',
        name: 'beIN Sports MAX 7 France HD (FR)',
        shortName: 'beIN MAX 7 FR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/iODFwZi.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports MAX 7 France (1080p)', url: `${EDGE_CDN_BASE}/premium497/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-max-9-fr',
        name: 'beIN Sports MAX 9 France HD (FR)',
        shortName: 'beIN MAX 9 FR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://assets.bein.com/mena/sites/3/2023/09/logos-_beINSPORTS9.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports MAX 9 France (1080p)', url: `${EDGE_CDN_BASE}/premium499/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-max-10-fr',
        name: 'beIN Sports MAX 10 France HD (FR)',
        shortName: 'beIN MAX 10 FR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports MAX 10 France (1080p)', url: `${EDGE_CDN_BASE}/premium500/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },

    // =========================================================================
    // 4. beIN SPORTS — TURKISH & SPANISH (TR / ES)
    // =========================================================================
    {
        id: 'bein-sports-1-tr',
        name: 'beIN Sports 1 Türkiye HD',
        shortName: 'beIN 1 TR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'tr',
        languageLabel: 'Türkçe (Turkish)',
        country: 'TR',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Sports 1 Türkiye (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium62/index.m3u8`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-2-tr',
        name: 'beIN Sports 2 Türkiye HD',
        shortName: 'beIN 2 TR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'tr',
        languageLabel: 'Türkçe (Turkish)',
        country: 'TR',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports 2 Türkiye (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium63/index.m3u8`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-3-tr',
        name: 'beIN Sports 3 Türkiye HD',
        shortName: 'beIN 3 TR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'tr',
        languageLabel: 'Türkçe (Turkish)',
        country: 'TR',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports 3 Türkiye (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium64/index.m3u8`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-4-tr',
        name: 'beIN Sports 4 Türkiye HD',
        shortName: 'beIN 4 TR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'tr',
        languageLabel: 'Türkçe (Turkish)',
        country: 'TR',
        logo: 'https://i.imgur.com/vwAgJNi.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports 4 Türkiye (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium67/index.m3u8`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-5-tr',
        name: 'beIN Sports 5 Türkiye HD',
        shortName: 'beIN 5 TR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'tr',
        languageLabel: 'Türkçe (Turkish)',
        country: 'TR',
        logo: 'https://i.imgur.com/2Rha5aY.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports 5 Türkiye (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium1010/index.m3u8`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-haber-tr',
        name: 'beIN Sports Haber / A Spor HD (TR)',
        shortName: 'A Spor / Haber TR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'tr',
        languageLabel: 'Türkçe (Turkish)',
        country: 'TR',
        logo: 'https://i.imgur.com/QWo0x7S.jpg',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'A Spor Türkiye HD (1080p)', url: 'https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/aspor/aspor.m3u8', quality: '1080p', language: 'tr' },
            { label: 'HT Spor Türkiye HD (1080p)', url: 'https://ciner.daioncdn.net/ht-spor/ht-spor.m3u8?app=web', quality: '1080p', language: 'tr' }
        ]
    },
    {
        id: 'bein-sports-xtra-es',
        name: 'beIN SPORTS XTRA en Español',
        shortName: 'beIN XTRA ES',
        network: 'beIN Sports',
        category: 'bein',
        language: 'es',
        languageLabel: 'Español (Spanish)',
        country: 'US',
        logo: 'https://i.imgur.com/V562tpO.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN XTRA Español (Amagi 1080p)', url: 'https://bein-esp-xumo.amagi.tv/playlistR1080p.m3u8', quality: '1080p', language: 'es' },
            { label: 'beIN XTRA Español (Tubi 1080p)', url: 'https://live-manifest.production-public.tubi.io/live/6cd31e43-d255-4ab4-b065-7f28bd541047/playlist.m3u8', quality: '1080p', language: 'es' }
        ]
    },

    // =========================================================================
    // 5. MENA & ARABIC SPORTS NETWORKS (SSC Sports, Alkass, Abu Dhabi Sports, Dubai Sports, KTV, Arryadia)
    // =========================================================================
    {
        id: 'ssc-sport-1-ar',
        name: 'SSC Sport 1 / Extra 1 HD (Saudi Sports)',
        shortName: 'SSC 1 AR',
        network: 'SSC Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'SSC Sport 1 / Extra 1 HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium619/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'ssc-sport-2-ar',
        name: 'SSC Sport 2 / Extra 2 HD (Saudi Sports)',
        shortName: 'SSC 2 AR',
        network: 'SSC Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'SSC Sport 2 / Extra 2 HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium620/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'ssc-sport-3-ar',
        name: 'SSC Sport 3 / Extra 3 HD (Saudi Sports)',
        shortName: 'SSC 3 AR',
        network: 'SSC Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'SSC Sport 3 / Extra 3 HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium621/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'ssc-extra-1-ar',
        name: 'SSC Sport Extra 1 HD (Saudi Sports)',
        shortName: 'SSC Extra 1 AR',
        network: 'SSC Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'SSC Sport Extra 1 HD (1080p)', url: `${EDGE_CDN_BASE}/premium619/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'ssc-extra-2-ar',
        name: 'SSC Sport Extra 2 HD (Saudi Sports)',
        shortName: 'SSC Extra 2 AR',
        network: 'SSC Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'SSC Sport Extra 2 HD (1080p)', url: `${EDGE_CDN_BASE}/premium620/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'ssc-extra-3-ar',
        name: 'SSC Sport Extra 3 HD (Saudi Sports)',
        shortName: 'SSC Extra 3 AR',
        network: 'SSC Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'SSC Sport Extra 3 HD (1080p)', url: `${EDGE_CDN_BASE}/premium621/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'alkass-1-ar',
        name: 'Alkass Sports HD 1 / 2 (Qatar)',
        shortName: 'Alkass 1 AR',
        network: 'Alkass Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Alkass Sports HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium782/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'alkass-2-ar',
        name: 'Alkass Sports HD 3 (Qatar)',
        shortName: 'Alkass 3 AR',
        network: 'Alkass Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Alkass Three HD (1080p)', url: `${EDGE_CDN_BASE}/premium783/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'alkass-3-ar',
        name: 'Alkass Sports HD 4 (Qatar)',
        shortName: 'Alkass 4 AR',
        network: 'Alkass Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Alkass Four HD (1080p)', url: `${EDGE_CDN_BASE}/premium784/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'ad-sports-1-ar',
        name: 'Abu Dhabi Sports 1 & Premium 1 HD (Arabic)',
        shortName: 'AD Sports 1',
        network: 'Abu Dhabi Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'AE',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Abu Dhabi Sports 1 HD (1080p)', url: `${EDGE_CDN_BASE}/premium600/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'Abu Dhabi Sports 1 Premium HD (1080p)', url: `${EDGE_CDN_BASE}/premium609/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'ad-sports-2-ar',
        name: 'Abu Dhabi Sports 2 Premium HD (Arabic)',
        shortName: 'AD Sports 2',
        network: 'Abu Dhabi Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'AE',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Abu Dhabi Sports 2 Premium HD (1080p)', url: `${EDGE_CDN_BASE}/premium610/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'dubai-sports-1-ar',
        name: 'Dubai Sports 1 HD (Arabic)',
        shortName: 'Dubai Sports 1',
        network: 'Dubai Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'AE',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Dubai Sports 1 HD (1080p)', url: `${EDGE_CDN_BASE}/premium604/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'Dubai Racing HD (1080p)', url: `${EDGE_CDN_BASE}/premium608/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'ktv-sport-ar',
        name: 'Kuwait TV Sport HD (KTV Sport)',
        shortName: 'KTV Sport AR',
        network: 'KTV Sport',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'KW',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'KTV Sport HD (Official 1080p)', url: 'https://kwtspta.cdn.mangomolo.com/sp/smil:sp.stream.smil/chunklist.m3u8', quality: '1080p', language: 'ar' },
            { label: 'KTV Sport Plus HD (1080p)', url: 'https://kwtsplta.cdn.mangomolo.com/spl/smil:spl.stream.smil/chunklist.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'arryadia-ar',
        name: 'Arryadia Morocco Sports HD',
        shortName: 'Arryadia MAR',
        network: 'SNRT Arryadia',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'MA',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '720p',
        featured: false,
        streams: [
            { label: 'Arryadia HD (Direct Stream)', url: 'http://149.100.11.252:8000/play/a065/index.m3u8', quality: '720p', language: 'ar' }
        ]
    },

    // =========================================================================
    // 6. beIN / SHAHID / MENA MOVIES, SERIES & ENTERTAINMENT (AR / EN)
    // =========================================================================
    {
        id: 'bein-movies-premiere-en',
        name: 'beIN / Sky Cinema Premiere HD (Movies)',
        shortName: 'Cinema Premiere',
        network: 'beIN / Sky Cinema',
        category: 'movies',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Cinema Premiere 1 HD (1080p)', url: `${EDGE_CDN_BASE}/premium671/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-movies-action-en',
        name: 'beIN / Sky Cinema Action HD (Movies)',
        shortName: 'Cinema Action',
        network: 'beIN / Sky Cinema',
        category: 'movies',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Cinema Action HD (1080p)', url: `${EDGE_CDN_BASE}/premium677/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-movies-hits-en',
        name: 'beIN / Sky Cinema Hits HD (Movies)',
        shortName: 'Cinema Hits',
        network: 'beIN / Sky Cinema',
        category: 'movies',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Cinema Hits HD (1080p)', url: `${EDGE_CDN_BASE}/premium673/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-movies-drama-en',
        name: 'beIN / Sky Cinema Drama HD (Movies)',
        shortName: 'Cinema Drama',
        network: 'beIN / Sky Cinema',
        category: 'movies',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/vwAgJNi.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Cinema Drama HD (1080p)', url: `${EDGE_CDN_BASE}/premium680/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'hbo-hd',
        name: 'HBO Movies & Series HD',
        shortName: 'HBO HD',
        network: 'HBO',
        category: 'movies',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'HBO East HD (1080p)', url: `${EDGE_CDN_BASE}/premium321/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'HBO 2 HD (1080p)', url: `${EDGE_CDN_BASE}/premium689/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'showtime-hd',
        name: 'Showtime Movies & Series HD',
        shortName: 'Showtime HD',
        network: 'Showtime',
        category: 'movies',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Showtime HD (1080p)', url: `${EDGE_CDN_BASE}/premium333/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'starz-hd',
        name: 'Starz Movies HD',
        shortName: 'Starz HD',
        network: 'Starz',
        category: 'movies',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Starz Movies HD (1080p)', url: `${EDGE_CDN_BASE}/premium335/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'cinemax-hd',
        name: 'Cinemax Action Movies HD',
        shortName: 'Cinemax HD',
        network: 'Cinemax',
        category: 'movies',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Cinemax HD (1080p)', url: `${EDGE_CDN_BASE}/premium374/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-movies-action-ar',
        name: 'Shahid / MENA Movies Action HD (أفلام أكشن)',
        shortName: 'Movies Action AR',
        network: 'Shahid / MBC Movies',
        category: 'movies',
        language: 'ar',
        languageLabel: 'العربية / مترجم (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Movies Action HD (1080p)', url: 'https://shd-amg-fast.edgenextcdn.net/tx011/playlist.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'bein-movies-thriller-ar',
        name: 'Shahid / MENA Movies Thriller HD (أفلام إثارة)',
        shortName: 'Movies Thriller AR',
        network: 'Shahid / MBC Movies',
        category: 'movies',
        language: 'ar',
        languageLabel: 'العربية / مترجم (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Movies Thriller HD (1080p)', url: 'https://shd-amg-fast.edgenextcdn.net/tx012/playlist.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'bein-aflam-ar',
        name: 'Shahid Aflam HD (أفلام عربية)',
        shortName: 'Aflam AR',
        network: 'Shahid / MBC Movies',
        category: 'movies',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Shahid Aflam HD (1080p)', url: 'https://shd-amg-fast.edgenextcdn.net/tx001/playlist.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'rotana-cinema-ar',
        name: 'Rotana Cinema HD (روتانا سينما)',
        shortName: 'Rotana Cinema',
        network: 'Rotana',
        category: 'movies',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Rotana Cinema HD (1080p)', url: 'https://rotana.hibridcdn.net/rotananet/cinema_net-7Y83PP5adWixDF93/playlist.m3u8', quality: '1080p', language: 'ar', headers: ROTANA_HEADERS }
        ]
    },
    {
        id: 'rotana-drama-ar',
        name: 'Rotana Drama HD (روتانا دراما)',
        shortName: 'Rotana Drama',
        network: 'Rotana',
        category: 'entertainment',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Rotana Drama HD (1080p)', url: 'https://rotana.hibridcdn.net/rotananet/drama_net-7Y83PP5adWixDF93/playlist.m3u8', quality: '1080p', language: 'ar', headers: ROTANA_HEADERS }
        ]
    },
    {
        id: 'rotana-comedy-ar',
        name: 'Rotana Comedy HD (روتانا كوميدي)',
        shortName: 'Rotana Comedy',
        network: 'Rotana',
        category: 'entertainment',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Rotana Comedy HD (1080p)', url: 'https://rotana.hibridcdn.net/rotananet/comedy_net-7Y83PP5adWixDF93/playlist.m3u8', quality: '1080p', language: 'ar', headers: ROTANA_HEADERS }
        ]
    },
    {
        id: 'mbc-1-ar',
        name: 'MBC 1 HD (إم بي سي 1)',
        shortName: 'MBC 1 HD',
        network: 'MBC',
        category: 'entertainment',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'MBC 1 HD (Primary 1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-1/15cf99af5de54063fdabfefe66adc075/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'MBC 1 MENA HD (1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-1-na/eec141533c90dd34722c503a296dd0d8/index.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'mbc-4-ar',
        name: 'MBC 4 Series & Entertainment HD (إم بي سي 4)',
        shortName: 'MBC 4 HD',
        network: 'MBC',
        category: 'entertainment',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'MBC 4 HD (1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-4/24f134f1cd63db9346439e96b86ca6ed/index.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'mbc-5-ar',
        name: 'MBC 5 Maghreb HD (إم بي سي 5)',
        shortName: 'MBC 5 HD',
        network: 'MBC',
        category: 'entertainment',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'MA',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'MBC 5 HD (1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-5/ee6b000cee0629411b666ab26cb13e9b/index.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'mbc-drama-ar',
        name: 'MBC Drama & MBC+ Drama HD (إم بي سي دراما)',
        shortName: 'MBC Drama HD',
        network: 'MBC',
        category: 'entertainment',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/vwAgJNi.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'MBC Drama HD (Primary 1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-drama/2c28a458e2f3253e678b07ac7d13fe71/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'MBC+ Drama HD (1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-plus-drama/e37251ec2aac8f6c98f75cd0fa37cd28/index.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'mbc-masr-ar',
        name: 'MBC Masr 1 & 2 HD (إم بي سي مصر)',
        shortName: 'MBC Masr HD',
        network: 'MBC',
        category: 'entertainment',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'EG',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'MBC Masr 1 HD (1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-masr/956eac069c78a35d47245db6cdbb1575/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'MBC Masr 2 HD (1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-masr-2/754931856515075b0aabf0e583495c68/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'MBC Masr Drama HD (1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-masr-drama/567b703c19ede6598222de81b0e4508b/index.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'mbc-iraq-ar',
        name: 'MBC Iraq HD (إم بي سي العراق)',
        shortName: 'MBC Iraq HD',
        network: 'MBC',
        category: 'entertainment',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'IQ',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'MBC Iraq HD (1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-iraq/e38c44b1b43474e1c39cb5b90203691e/index.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'bab-al-hara-ar',
        name: 'Bab Al Hara Series 24/7 HD (باب الحارة)',
        shortName: 'Bab Al Hara',
        network: 'Shahid Series',
        category: 'entertainment',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Bab Al Hara 24/7 HD (1080p)', url: 'https://shd-amg-fast.edgenextcdn.net/tx010/playlist.m3u8', quality: '1080p', language: 'ar' },
            { label: 'Maraya Comedy 24/7 HD (1080p)', url: 'https://shd-amg-fast.edgenextcdn.net/tx008/playlist.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'spacetoon-ar',
        name: 'Spacetoon Arabic HD (سبيستون)',
        shortName: 'Spacetoon AR',
        network: 'Spacetoon',
        category: 'entertainment',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'AE',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '720p',
        featured: false,
        streams: [
            { label: 'Spacetoon Arabic Live', url: 'https://live-uae-next.spacetoongo.com/ST_MENA_NEXT/hls/r9p2hjipmw2kl.m3u8', quality: '720p', language: 'ar' }
        ]
    },

    // =========================================================================
    // 6. UK & EUROPEAN PREMIUM SPORTS (Sky Sports, TNT Sports, Eurosport, Canal+, RMC, DAZN)
    // =========================================================================
    {
        id: 'sky-sports-main-event',
        name: 'Sky Sports Main Event UK HD',
        shortName: 'Sky Main Event',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sports Main Event (1080p)', url: `${EDGE_CDN_BASE}/premium38/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sports-premier-league',
        name: 'Sky Sports Premier League UK HD',
        shortName: 'Sky Premier League',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sports Premier League (1080p)', url: `${EDGE_CDN_BASE}/premium130/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sports-football',
        name: 'Sky Sports Football UK HD',
        shortName: 'Sky Football',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sports Football UK (1080p)', url: `${EDGE_CDN_BASE}/premium35/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports Action UK (1080p)', url: 'http://stream.bottledesk.net/p/AQNASgYGemc/index.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'sky-sports-f1',
        name: 'Sky Sports F1 UK HD',
        shortName: 'Sky Sports F1',
        network: 'Sky Sports',
        category: 'motorsport',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sports F1 UK (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium60/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports F1 UK (Mirror 1080p)', url: 'http://stream.bottledesk.net/p/AwZGQwwEZA/index.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'tnt-sports-1',
        name: 'TNT Sports 1 UK HD',
        shortName: 'TNT Sports 1',
        network: 'TNT Sports',
        category: 'europe',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'TNT Sports 1 UK (1080p)', url: `${EDGE_CDN_BASE}/premium31/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'tnt-sports-2',
        name: 'TNT Sports 2 UK HD',
        shortName: 'TNT Sports 2',
        network: 'TNT Sports',
        category: 'europe',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'TNT Sports 2 UK (1080p)', url: `${EDGE_CDN_BASE}/premium32/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'tnt-sports-3',
        name: 'TNT Sports 3 UK HD',
        shortName: 'TNT Sports 3',
        network: 'TNT Sports',
        category: 'europe',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'TNT Sports 3 UK (1080p)', url: `${EDGE_CDN_BASE}/premium33/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'tnt-sports-4',
        name: 'TNT Sports 4 UK HD',
        shortName: 'TNT Sports 4',
        network: 'TNT Sports',
        category: 'europe',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'TNT Sports 4 UK (1080p)', url: `${EDGE_CDN_BASE}/premium34/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },

    // =========================================================================
    // 7. FOX SPORTS & US SPORTS NETWORKS
    // =========================================================================
    {
        id: 'fox-sports-1',
        name: 'Fox Sports 1 (FS1 HD)',
        shortName: 'FS1 HD',
        network: 'Fox Sports',
        category: 'fox',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Fox Sports 1 US (Edge 1080p)', url: `${EDGE_CDN_BASE}/premium39/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Fox Sports 1 US (Direct HD)', url: 'http://85.237.89.160:9590/usa-s/FOX-SPORTS-1/index.m3u8', quality: '720p', language: 'en' }
        ]
    },
    {
        id: 'fox-sports-2',
        name: 'Fox Sports 2 (FS2 HD)',
        shortName: 'FS2 HD',
        network: 'Fox Sports',
        category: 'fox',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Fox Sports 2 US (Edge 1080p)', url: `${EDGE_CDN_BASE}/premium758/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Fox Sports 2 US (TVNow 1080p)', url: 'https://cache0.wonvt.st/live/13r6cob1fh05tc1261qhx/master.m3u8', quality: '1080p', language: 'en', headers: TVNOW_HEADERS }
        ]
    },
    {
        id: 'fox-sports-news',
        name: 'Fox Sports News (1080p)',
        shortName: 'Fox Sports News',
        network: 'Fox Sports',
        category: 'fox',
        language: 'en',
        languageLabel: 'English',
        country: 'AU',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Fox Sports News (1080p CDN)', url: 'https://skynewsau-live-premium.akamaized.net/hls/live/2105307/foxsportsnews/live_1080p.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'espn-hd',
        name: 'ESPN HD (United States)',
        shortName: 'ESPN HD',
        network: 'ESPN',
        category: 'espn',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/960px-ESPN_wordmark.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'ESPN US (Edge 1080p)', url: `${EDGE_CDN_BASE}/premium44/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'ESPN US (Direct HD)', url: 'http://85.237.89.160:9590/usa-s/ESPN-HD/index.m3u8', quality: '720p', language: 'en' },
            { label: 'ESPN US (Mirror 1080p)', url: 'http://stream.bottledesk.net/6500/index.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'espn-2-hd',
        name: 'ESPN 2 HD (United States)',
        shortName: 'ESPN 2 HD',
        network: 'ESPN',
        category: 'espn',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/ESPN2_logo.svg/960px-ESPN2_logo.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'ESPN 2 US (Edge 1080p)', url: `${EDGE_CDN_BASE}/premium45/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'ESPN 2 US (Direct HD)', url: 'http://85.237.89.160:9590/usa-s/ESPN-2-HD/index.m3u8', quality: '720p', language: 'en' }
        ]
    },
    {
        id: 'espnu-hd',
        name: 'ESPNU HD',
        shortName: 'ESPNU',
        network: 'ESPN',
        category: 'espn',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/HiBrysh.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'ESPNU HD (Edge 1080p)', url: `${EDGE_CDN_BASE}/premium316/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'ESPNU HD (US Direct)', url: 'http://85.237.89.160:9590/usa-s/ESPN-U-HD/index.m3u8', quality: '720p', language: 'en' },
            { label: 'ESPNU Backup', url: 'http://23.237.104.106:8080/USA_ESPNU/index.m3u8', quality: '720p', language: 'en' }
        ]
    },
    {
        id: 'cbs-sports-golazo',
        name: 'CBS Sports Golazo Network',
        shortName: 'CBS Golazo',
        network: 'CBS Sports',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'CBS Golazo (Pluto Live HD)', url: 'https://jmp2.uk/plu-63a0e33a45264d000850ed7e.m3u8', quality: '720p', language: 'en' }
        ]
    },
    {
        id: 'nbc-sports-now',
        name: 'NBC Sports NOW HD',
        shortName: 'NBC Sports',
        network: 'NBC Sports',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'NBC Sports (CloudFront 1080p)', url: 'https://d4whmvwm0rdvi.cloudfront.net/10007/99993008/hls/master.m3u8?ads.xumo_channelId=99993008', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'nba-tv',
        name: 'NBA TV HD',
        shortName: 'NBA TV',
        network: 'NBA',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'NBA TV (Edge 1080p)', url: `${EDGE_CDN_BASE}/premium404/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'NBA TV (US Mirror)', url: 'http://23.237.104.106:8080/USA_NBA/index.m3u8', quality: '720p', language: 'en' }
        ]
    },
    {
        id: 'nfl-network',
        name: 'NFL Network HD',
        shortName: 'NFL Network',
        network: 'NFL',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'NFL Network (Edge 1080p)', url: `${EDGE_CDN_BASE}/premium405/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'NFL RedZone (Edge 1080p)', url: `${EDGE_CDN_BASE}/premium667/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'NFL Channel (Pluto HD)', url: 'https://jmp2.uk/plu-5ced7d5df64be98e07ed47b6.m3u8', quality: '720p', language: 'en' }
        ]
    },
    {
        id: 'nhl-network',
        name: 'NHL Network (1080p)',
        shortName: 'NHL Network',
        network: 'NHL',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'NHL Network (Amagi 1080p)', url: 'https://nhl-firetv.amagi.tv/playlist.m3u8', quality: '1080p', language: 'en' },
            { label: 'NHL Network (Edge 1080p)', url: `${EDGE_CDN_BASE}/premium663/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'NHL Network (TVNow 1080p)', url: 'https://cache0.wonvt.st/live/0nkruul0d8pahi1pz4sjc/master.m3u8', quality: '1080p', language: 'en', headers: TVNOW_HEADERS }
        ]
    },
    {
        id: 'mlb-network',
        name: 'MLB Network / Strike Zone HD',
        shortName: 'MLB Network',
        network: 'MLB',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'MLB Network (Edge 1080p)', url: `${EDGE_CDN_BASE}/premium399/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'MLB Network (TVNow 1080p)', url: 'https://cache0.wonvt.st/live/0s8stho175fs0z1w0nugo/master.m3u8', quality: '1080p', language: 'en', headers: TVNOW_HEADERS },
            { label: 'MLB Strike Zone (US HD)', url: 'http://23.237.104.106:8080/USA_MLB_STRIKE_ZONE/index.m3u8', quality: '720p', language: 'en' }
        ]
    },

    // =========================================================================
    // 8. EUROPEAN, FRENCH & SPANISH SPORTS (Eurosport, Canal+, RMC, L'Équipe, FIFA+, Premier Sports)
    // =========================================================================
    {
        id: 'eurosport-1',
        name: 'Eurosport 1 HD',
        shortName: 'Eurosport 1',
        network: 'Eurosport',
        category: 'europe',
        language: 'en',
        languageLabel: 'Multi / English / FR',
        country: 'FR',
        logo: 'https://i.imgur.com/olQJgm7.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Eurosport 1 (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium231/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Eurosport 1 France (1080p)', url: `${EDGE_CDN_BASE}/premium772/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Eurosport 1 Intl (1080p)', url: `${EDGE_CDN_BASE}/premium57/index.m3u8`, quality: '1080p', language: 'multi', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'eurosport-2',
        name: 'Eurosport 2 HD',
        shortName: 'Eurosport 2',
        network: 'Eurosport',
        category: 'europe',
        language: 'en',
        languageLabel: 'Multi / English / FR',
        country: 'FR',
        logo: 'https://i.imgur.com/f56dHgR.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Eurosport 2 (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium42/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Eurosport 2 France (1080p)', url: `${EDGE_CDN_BASE}/premium773/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Eurosport 2 Intl (1080p)', url: `${EDGE_CDN_BASE}/premium58/index.m3u8`, quality: '1080p', language: 'multi', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'canal-plus-foot-fr',
        name: 'Canal+ Foot / Sport France HD',
        shortName: 'Canal+ Foot FR',
        network: 'Canal+',
        category: 'europe',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Canal+ Foot France (1080p)', url: `${EDGE_CDN_BASE}/premium463/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Canal+ Sport France (1080p)', url: `${EDGE_CDN_BASE}/premium122/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'rmc-sport-1-fr',
        name: 'RMC Sport 1 France HD',
        shortName: 'RMC Sport 1 FR',
        network: 'RMC Sport',
        category: 'europe',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'RMC Sport 1 France (1080p)', url: `${EDGE_CDN_BASE}/premium119/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'RMC Sport 2 France (1080p)', url: `${EDGE_CDN_BASE}/premium120/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'lequipe-fr',
        name: "L'Équipe TV France (1080p)",
        shortName: "L'Équipe FR",
        network: "L'Équipe",
        category: 'europe',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/L%27%C3%89quipe_wordmark.svg/512px-L%27%C3%89quipe_wordmark.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: "L'Équipe France (CloudFront 1080p)", url: 'https://dq37unyetkpcz.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-m04j89j7k5gtp/LEquipe_FR.m3u8', quality: '1080p', language: 'fr' }
        ]
    },
    {
        id: 'fifa-plus-fr',
        name: 'FIFA+ France (FR)',
        shortName: 'FIFA+ FR',
        network: 'FIFA+',
        category: 'europe',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '720p',
        featured: false,
        streams: [
            { label: 'FIFA+ Français (Wurl CDN)', url: 'https://37b4c228.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWZyX0ZJRkFQbHVzRnJlbmNoX0hMUw/playlist.m3u8', quality: '720p', language: 'fr' }
        ]
    },
    {
        id: 'fifa-plus-en',
        name: 'FIFA+ Global (English)',
        shortName: 'FIFA+ EN',
        network: 'FIFA+',
        category: 'europe',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '720p',
        featured: false,
        streams: [
            { label: 'FIFA+ English (Pluto CDN)', url: 'https://jmp2.uk/plu-660c29b5aec9680008f5b4a4.m3u8', quality: '720p', language: 'en' },
            { label: 'FIFA+ US (CloudFront)', url: 'https://d2w9q46ikgrcwx.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-of5cbk3sav3w5/v1/sysdata_s_p_a_fifa_7/samsungheadend_us/latest/main/hls/playlist.m3u8', quality: '720p', language: 'en' }
        ]
    },
    {
        id: 'premier-sports-1',
        name: 'Premier Sports 1 UK (1080p)',
        shortName: 'Premier Sports 1',
        network: 'Premier Sports',
        category: 'europe',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Premier Sports 1 (Amagi 1080p)', url: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8', quality: '1080p', language: 'en' },
            { label: 'Premier Sports 1 (Edge 1080p)', url: `${EDGE_CDN_BASE}/premium771/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'premier-sports-2',
        name: 'Premier Sports 2 UK (1080p)',
        shortName: 'Premier Sports 2',
        network: 'Premier Sports',
        category: 'europe',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Premier Sports 2 (Amagi 1080p)', url: 'https://amg19223-amg19223c4-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c4-amgplt0351/playlist.m3u8', quality: '1080p', language: 'en' },
            { label: 'Premier Sports 2 (Edge 1080p)', url: `${EDGE_CDN_BASE}/premium799/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'real-madrid-tv',
        name: 'Real Madrid TV HD',
        shortName: 'Real Madrid TV',
        network: 'Real Madrid',
        category: 'europe',
        language: 'es',
        languageLabel: 'Español / English',
        country: 'ES',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '720p',
        featured: false,
        streams: [
            { label: 'Real Madrid TV (Akamai Official)', url: 'https://rmtv.akamaized.net/hls/live/2043153/rmtv-es-web/master.m3u8', quality: '720p', language: 'es' }
        ]
    },
    {
        id: 'dazn-combat',
        name: 'DAZN Combat & Boxing HD',
        shortName: 'DAZN Combat',
        network: 'DAZN',
        category: 'combat',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.postimg.cc/VsW3Jsrz/logo-DAZN-Combat.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'DAZN Combat (Primary)', url: 'https://jmp2.uk/plu-64d626ac9b414d000820e2fc.m3u8', quality: '720p', language: 'en' },
            { label: 'DAZN LaLiga (1080p)', url: `${EDGE_CDN_BASE}/premium538/index.m3u8`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS },
            { label: 'DAZN Ligue 1 (1080p)', url: `${EDGE_CDN_BASE}/premium960/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'PFL MMA Network', url: 'https://jmp2.uk/plu-64f6180130ab3300083d896b.m3u8', quality: '720p', language: 'en' }
        ]
    },
    {
        id: 'red-bull-tv',
        name: 'Red Bull TV Motorsports (1080p)',
        shortName: 'Red Bull TV',
        network: 'Red Bull',
        category: 'motorsport',
        language: 'en',
        languageLabel: 'English',
        country: 'AT',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Red Bull TV (Akamai 1080p)', url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8', quality: '1080p', language: 'en' },
            { label: 'Rally TV Motorsports (1080p)', url: 'https://rally-tv-live.akamaized.net/hls/live/2117704/RallyTV-Pri/master.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'tennis-channel',
        name: 'Tennis Channel HD (1080p)',
        shortName: 'Tennis Channel',
        network: 'Tennis Channel',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Tennis Channel 1 (US 1080p)', url: 'http://23.237.104.106:8080/USA_TENNIS/index.m3u8', quality: '1080p', language: 'en' },
            { label: 'Tennis Channel (Amagi 1080p)', url: 'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01444-tennischannelth-tennischannelnl-samsungnl/playlist.m3u8', quality: '1080p', language: 'en' }
        ]
    }
];

// ============================================================================
// EDGE CDN TOKEN RESOLVER & MPEG-TS SEGMENT UNWRAPPER
// ============================================================================
const edgeTokenCache = new Map<string, { token: string; expiresAt: number }>();
const edgeTokenInFlight = new Map<string, Promise<string | null>>();

/**
 * Fetches or reuses a short-lived playlist token for edge.cowedd4855ws.sbs/premium<ID>/index.m3u8
 */
async function getEdgePlaylistToken(slug: string): Promise<string | null> {
    const cached = edgeTokenCache.get(slug);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.token;
    }

    const existingFlight = edgeTokenInFlight.get(slug);
    if (existingFlight) {
        return existingFlight;
    }

    const flight = (async () => {
        try {
            const res = await fetch(`${EDGE_CDN_BASE}/api/playlist-token?slug=${encodeURIComponent(slug)}`, {
                headers: {
                    'User-Agent': DEFAULT_UA,
                    ...DEMBED_HEADERS
                },
                signal: AbortSignal.timeout(4000)
            });
            if (!res.ok) return null;
            const data = (await res.json()) as { token?: string; ttl?: number };
            if (!data?.token) return null;
            const ttlSec = Math.max(30, Number(data.ttl) || 120);
            edgeTokenCache.set(slug, {
                token: data.token,
                expiresAt: Date.now() + (ttlSec - 20) * 1000
            });
            return data.token;
        } catch {
            return null;
        } finally {
            edgeTokenInFlight.delete(slug);
        }
    })();

    edgeTokenInFlight.set(slug, flight);
    return flight;
}

/**
 * If a URL targets edge.cowedd4855ws.sbs/premium<ID>/index.m3u8, attaches a fresh `t=<token>&_=<ts>`
 */
async function resolveDynamicManifestUrl(
    rawUrl: string,
    headers?: Record<string, string>
): Promise<{ url: string; headers: Record<string, string> }> {
    const mergedHeaders: Record<string, string> = {
        'User-Agent': DEFAULT_UA,
        ...(headers || {})
    };

    const edgeMatch = rawUrl.match(/edge\.cowedd4855ws\.sbs\/(premium\d+)\/index\.m3u8/i);
    if (edgeMatch) {
        const slug = edgeMatch[1];
        Object.assign(mergedHeaders, DEMBED_HEADERS);
        const token = await getEdgePlaylistToken(slug);
        const baseClean = `${EDGE_CDN_BASE}/${slug}/index.m3u8`;
        const finalUrl = token
            ? `${baseClean}?t=${encodeURIComponent(token)}&_=${Date.now()}`
            : `${baseClean}?_=${Date.now()}`;
        return { url: finalUrl, headers: mergedHeaders };
    }

    return { url: rawUrl, headers: mergedHeaders };
}

function extractWebpExifTs(bytes: Uint8Array): Uint8Array | null {
    if (bytes.length < 16) return null;
    if (
        bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46 ||
        bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50
    ) {
        return null;
    }
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let off = 12;
    while (off + 8 <= bytes.length) {
        const tag = String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]);
        const n = dv.getUint32(off + 4, true);
        off += 8;
        if (n < 0 || off + n > bytes.length) return null;
        if (tag === 'EXIF') {
            const data = bytes.subarray(off, off + n);
            if (data.length >= 188 && data[0] === 0x47 && data[188] === 0x47) return data;
            return null;
        }
        off += n + (n & 1);
    }
    return null;
}

function extractPngIendTs(bytes: Uint8Array): Uint8Array | null {
    if (bytes.length < 16 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let off = 8;
    while (off + 8 <= bytes.length) {
        const len = dv.getUint32(off);
        if (len > bytes.length - off - 12) return null;
        const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
        off += 8 + len + 4;
        if (type === 'IEND') {
            if (off < bytes.length && bytes[off] === 0x47 && off + 188 < bytes.length && bytes[off + 188] === 0x47) {
                return bytes.subarray(off);
            }
            return null;
        }
    }
    return null;
}

function paethPredictor(a: number, b: number, c: number): number {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

function extractPngPixelsTs(bytes: Uint8Array): Buffer | null {
    if (bytes.length < 16 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let off = 8;
    let w = 0;
    let h = 0;
    let depth = 0;
    let ctype = 0;
    let interlace = 0;
    const idats: Uint8Array[] = [];

    while (off + 8 <= bytes.length) {
        const len = dv.getUint32(off);
        if (len > bytes.length - off - 12) return null;
        const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
        const data = bytes.subarray(off + 8, off + 8 + len);
        if (type === 'IHDR') {
            const hd = new DataView(data.buffer, data.byteOffset, data.byteLength);
            w = hd.getUint32(0);
            h = hd.getUint32(4);
            depth = data[8];
            ctype = data[9];
            interlace = data[12];
        } else if (type === 'IDAT') {
            idats.push(data);
        } else if (type === 'IEND') {
            break;
        }
        off += 12 + len;
    }

    if (!w || !h || depth !== 8 || interlace || (ctype !== 2 && ctype !== 6)) return null;

    let zlen = 0;
    for (const p of idats) zlen += p.length;
    const zbuf = Buffer.allocUnsafe(zlen);
    let zoff = 0;
    for (const p of idats) {
        zbuf.set(p, zoff);
        zoff += p.length;
    }

    let raw: Buffer;
    try {
        raw = zlib.inflateSync(zbuf);
    } catch {
        return null;
    }

    const bpp = ctype === 6 ? 4 : 3;
    const stride = w * bpp;
    const rgb = Buffer.allocUnsafe(w * h * 3);
    let src = 0;
    let dst = 0;
    let prev: ArrayLike<number> = new Uint8Array(stride);

    for (let y = 0; y < h; y++) {
        if (src + 1 + stride > raw.length) return null;
        const filter = raw[src++];
        const row = raw.subarray(src, src + stride);
        src += stride;

        if (filter === 0) {
            if (ctype === 2) {
                rgb.set(row, dst);
            } else {
                for (let i = 0, o = dst; i < stride; i += 4) {
                    rgb[o++] = row[i];
                    rgb[o++] = row[i + 1];
                    rgb[o++] = row[i + 2];
                }
            }
            dst += w * 3;
            prev = row;
            continue;
        }

        const recon = new Uint8Array(stride);
        for (let i = 0; i < stride; i++) {
            const a = i >= bpp ? recon[i - bpp] : 0;
            const b = prev[i];
            const c = i >= bpp ? prev[i - bpp] : 0;
            let v = row[i];
            if (filter === 1) v += a;
            else if (filter === 2) v += b;
            else if (filter === 3) v += (a + b) >> 1;
            else if (filter === 4) v += paethPredictor(a, b, c);
            else return null;
            recon[i] = v & 255;
        }
        if (ctype === 2) {
            rgb.set(recon, dst);
            dst += stride;
        } else {
            for (let i = 0; i < stride; i += 4) {
                rgb[dst++] = recon[i];
                rgb[dst++] = recon[i + 1];
                rgb[dst++] = recon[i + 2];
            }
        }
        prev = recon;
    }

    // Check TPIX header ("TIKTIKPX")
    const TPIX = [84, 73, 75, 84, 73, 75, 80, 88];
    if (rgb.length < 12) return null;
    for (let k = 0; k < 8; k++) {
        if (rgb[k] !== TPIX[k]) return null;
    }
    const n = rgb.readUInt32BE(8);
    if (n <= 0 || 12 + n > rgb.length) return null;
    const gz = rgb.subarray(12, 12 + n);
    if (gz.length < 2 || gz[0] !== 0x1f || gz[1] !== 0x8b) return null;

    try {
        const ts = zlib.gunzipSync(gz);
        if (ts.length > 0 && ts[0] === 0x47) return ts;
    } catch {
        return null;
    }
    return null;
}

/**
 * Unwraps disguised MPEG-TS segments (PNG IEND, PNG TPIX, WebP EXIF, TRAW, TSGZ, or offset 0x47 sync byte)
 * into standard MPEG-TS binary buffers so hls.js can play them natively.
 */
export function unwrapLiveTsSegment(buf: Buffer): Buffer {
    if (buf.length < 188) return buf;
    // Already a clean MPEG-TS segment
    if (buf[0] === 0x47 && buf[188] === 0x47) return buf;

    const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

    const fromWebp = extractWebpExifTs(bytes);
    if (fromWebp) {
        return Buffer.from(fromWebp.buffer, fromWebp.byteOffset, fromWebp.byteLength);
    }

    const fromPng = extractPngIendTs(bytes);
    if (fromPng) {
        return Buffer.from(fromPng.buffer, fromPng.byteOffset, fromPng.byteLength);
    }

    const fromPngPixels = extractPngPixelsTs(bytes);
    if (fromPngPixels) {
        return fromPngPixels;
    }

    const TRAW = Buffer.from([84, 73, 75, 84, 73, 75, 82, 65, 87]);
    const idxRaw = buf.indexOf(TRAW);
    if (idxRaw !== -1) {
        const sub = buf.subarray(idxRaw + TRAW.length);
        if (sub.length > 0 && sub[0] === 0x47) return sub;
    }

    const TSGZ = Buffer.from([84, 73, 75, 84, 73, 75, 84, 83, 71, 90]);
    const idxGz = buf.indexOf(TSGZ);
    if (idxGz !== -1) {
        try {
            const unzipped = zlib.gunzipSync(buf.subarray(idxGz + TSGZ.length));
            if (unzipped.length > 0 && unzipped[0] === 0x47) return unzipped;
        } catch {
            // Fall through
        }
    }

    // Scan for 3 consecutive MPEG-TS 188-byte packet sync bytes (0x47)
    for (let i = 0; i + 376 < buf.length; i++) {
        if (buf[i] === 0x47 && buf[i + 188] === 0x47 && buf[i + 376] === 0x47) {
            return buf.subarray(i);
        }
    }

    return buf;
}

// ============================================================================
// DYNAMIC M3U HARVESTER (Preserves #EXTVLCOPT Referer & User-Agent headers)
// ============================================================================
let dynamicChannelCache: Map<
    string,
    Array<{ label: string; url: string; quality: string; headers?: Record<string, string> }>
> = new Map();
let lastHarvestTime = 0;
const HARVEST_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Harvests fresh M3U streams from public IPTV-org & doms9 sports feeds in the background
 */
export async function harvestDynamicSportsM3U(): Promise<void> {
    if (Date.now() - lastHarvestTime < HARVEST_TTL_MS && dynamicChannelCache.size > 0) {
        return;
    }

    const m3uFeeds = [
        'https://raw.githubusercontent.com/doms9/iptv/default/M3U8/base.m3u8',
        'https://iptv-org.github.io/iptv/categories/sports.m3u',
        'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/qa.m3u',
        'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us.m3u',
        'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/fr.m3u'
    ];

    const harvested = new Map<
        string,
        Array<{ label: string; url: string; quality: string; headers?: Record<string, string> }>
    >();

    await Promise.allSettled(
        m3uFeeds.map(async (feedUrl) => {
            try {
                const res = await fetch(feedUrl, {
                    headers: { 'User-Agent': DEFAULT_UA },
                    signal: AbortSignal.timeout(4500)
                });
                if (!res.ok) return;
                const text = await res.text();
                const lines = text.split(/\r?\n/);

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line.startsWith('#EXTINF')) continue;

                    const optHeaders: Record<string, string> = {};
                    let j = i + 1;
                    while (j < lines.length && lines[j].startsWith('#EXTVLCOPT:')) {
                        const optLine = lines[j];
                        if (optLine.startsWith('#EXTVLCOPT:http-referrer=')) {
                            optHeaders['Referer'] = optLine.slice('#EXTVLCOPT:http-referrer='.length).trim();
                        } else if (optLine.startsWith('#EXTVLCOPT:http-user-agent=')) {
                            optHeaders['User-Agent'] = optLine.slice('#EXTVLCOPT:http-user-agent='.length).trim();
                        }
                        j++;
                    }
                    const streamUrl = (lines[j] || '').trim();
                    if (
                        !streamUrl.startsWith('http') ||
                        streamUrl.endsWith('.mpd') ||
                        streamUrl.includes('primetv.cc.cd') ||
                        streamUrl.includes('andro.')
                    ) {
                        continue;
                    }

                    const tvgId = (line.match(/tvg-id="([^"]+)"/i) || [])[1] || '';
                    const title = (line.match(/,(.+)$/) || [])[1]?.trim() || tvgId;
                    const qualityMatch = title.match(/\b(4K|2160p|1080p|720p|576p|480p)\b/i);
                    const quality = qualityMatch ? qualityMatch[1] : 'HD';

                    const key = `${tvgId} ${title}`.toLowerCase();
                    for (const ch of CORE_SPORTS_CHANNELS) {
                        const matchBeinNum = ch.id.match(/^bein-sports-(\d+)-(ar|tr)$/);
                        let matched = false;
                        if (matchBeinNum) {
                            const num = matchBeinNum[1];
                            const lang = matchBeinNum[2];
                            if (lang === 'ar' && key.includes(`beinsports${num}.qa`)) matched = true;
                            if (lang === 'tr' && key.includes(`beinsports${num}turk`)) matched = true;
                        } else if (ch.id === 'bein-sports-xtra-en' && (key.includes('beinsportsxtra.us') || key.includes('bein.sports.xtra'))) {
                            matched = true;
                        } else if (ch.id === 'fox-sports-1' && (key.includes('foxsports1.us') || key.includes('fs1.hd.us'))) {
                            matched = true;
                        } else if (ch.id === 'fox-sports-2' && (key.includes('foxsports2.us') || key.includes('fs2.hd.us'))) {
                            matched = true;
                        } else if (ch.id === 'espn-hd' && (key.includes('espn.us@hd') || key.includes('espn.hd.us'))) {
                            matched = true;
                        } else if (ch.id === 'espn-2-hd' && (key.includes('espn2.us@hd') || key.includes('espn2.hd.us'))) {
                            matched = true;
                        }

                        if (matched) {
                            const existing = harvested.get(ch.id) || [];
                            if (!existing.some((e) => e.url === streamUrl)) {
                                existing.push({
                                    label: `${ch.shortName} (Backup ${quality})`,
                                    url: streamUrl,
                                    quality,
                                    headers: Object.keys(optHeaders).length > 0 ? optHeaders : undefined
                                });
                                harvested.set(ch.id, existing);
                            }
                        }
                    }
                }
            } catch {
                // Ignore individual feed errors
            }
        })
    );

    if (harvested.size > 0) {
        dynamicChannelCache = harvested;
        lastHarvestTime = Date.now();
    }
}

/**
 * Builds a proxied URL through CinePro's Live HLS Proxy
 */
export function buildLiveProxyUrl(rawUrl: string, publicBaseUrl: string, headers?: Record<string, string>): string {
    const proxyPayload = JSON.stringify({
        url: rawUrl,
        headers: {
            'User-Agent': DEFAULT_UA,
            ...(headers || {})
        }
    });
    return `${publicBaseUrl}/v1/live/proxy/manifest.m3u8?data=${encodeURIComponent(proxyPayload)}`;
}

/**
 * Fast liveness check for an M3U8 stream (supports Edge dynamic token injection)
 */
async function probeStreamLiveness(
    url: string,
    headers?: Record<string, string>,
    timeoutMs = 5500
): Promise<{ ok: boolean; latencyMs: number }> {
    const t0 = Date.now();
    try {
        const resolved = await resolveDynamicManifestUrl(url, headers);
        const res = await fetch(resolved.url, {
            method: 'GET',
            headers: resolved.headers,
            signal: AbortSignal.timeout(timeoutMs)
        });
        if (!res.ok) {
            return { ok: false, latencyMs: Date.now() - t0 };
        }
        const chunk = await res.text();
        const isM3U = chunk.includes('#EXTM3U') || chunk.includes('#EXT-X-');
        return { ok: isM3U, latencyMs: Date.now() - t0 };
    } catch {
        return { ok: false, latencyMs: Date.now() - t0 };
    }
}

/**
 * Returns filtered list of Live Sports Channels
 */
export function getLiveChannels(
    publicBaseUrl: string,
    filters?: { lang?: string; category?: string; query?: string }
): Array<LiveChannel & { streamEndpoint: string; defaultProxyUrl: string }> {
    harvestDynamicSportsM3U().catch(() => {});

    let list = [...CORE_SPORTS_CHANNELS];

    if (filters?.lang && filters.lang !== 'all') {
        const langLower = filters.lang.toLowerCase();
        list = list.filter((c) => c.language === langLower || c.language === 'multi');
    }

    if (filters?.category && filters.category !== 'all') {
        const catLower = filters.category.toLowerCase();
        list = list.filter((c) => c.category === catLower || c.network.toLowerCase().includes(catLower));
    }

    if (filters?.query) {
        const q = filters.query.toLowerCase().trim();
        list = list.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.shortName.toLowerCase().includes(q) ||
                c.network.toLowerCase().includes(q) ||
                c.languageLabel.toLowerCase().includes(q) ||
                c.id.toLowerCase().includes(q)
        );
    }

    return list.map((ch) => {
        const primaryStream = ch.streams[0];
        return {
            ...ch,
            streamEndpoint: `${publicBaseUrl}/v1/live/stream/${ch.id}`,
            defaultProxyUrl: primaryStream ? buildLiveProxyUrl(primaryStream.url, publicBaseUrl, primaryStream.headers) : ''
        };
    });
}

/**
 * Resolves and verifies all streams strictly for a given channel ID (never mixes other channels)
 */
export async function resolveChannelStreams(
    channelId: string,
    publicBaseUrl: string,
    onStreamVerified?: (source: LiveStreamSource) => void
): Promise<{
    channel: LiveChannel | null;
    sources: LiveStreamSource[];
}> {
    await harvestDynamicSportsM3U().catch(() => {});

    const normalizedId = channelId.toLowerCase().trim();
    const channel =
        CORE_SPORTS_CHANNELS.find((c) => c.id === normalizedId) ||
        CORE_SPORTS_CHANNELS.find((c) => c.shortName.toLowerCase().replace(/\s+/g, '-') === normalizedId) ||
        null;

    if (!channel) {
        return { channel: null, sources: [] };
    }

    // Merge curated streams + dynamically harvested M3U backups strictly for this exact channel ID
    const dynamicBackups = dynamicChannelCache.get(channel.id) || [];
    const candidateStreams = [...channel.streams];
    for (const dyn of dynamicBackups) {
        if (!candidateStreams.some((s) => s.url === dyn.url)) {
            candidateStreams.push({
                label: dyn.label,
                url: dyn.url,
                quality: dyn.quality,
                language: channel.language,
                headers: dyn.headers
            });
        }
    }

    // Probe all candidate streams for this channel
    const probed = await Promise.all(
        candidateStreams.map(async (item, index) => {
            const probe = await probeStreamLiveness(item.url, item.headers, 5500);
            const proxiedUrl = buildLiveProxyUrl(item.url, publicBaseUrl, item.headers);

            const langMap: Record<string, string> = {
                ar: 'العربية (Arabic)',
                en: 'English',
                fr: 'Français (French)',
                es: 'Español (Spanish)',
                tr: 'Türkçe (Turkish)',
                multi: 'Multi-Audio'
            };

            const sourceObj: LiveStreamSource = {
                id: `${channel.id}-s${index + 1}`,
                server: item.label,
                url: proxiedUrl,
                rawUrl: item.url,
                quality: item.quality,
                language: item.language,
                languageLabel: langMap[item.language] || 'English',
                type: 'hls',
                verified: probe.ok,
                latencyMs: probe.latencyMs,
                headers: item.headers,
                audioTracks: [{ language: item.language, label: langMap[item.language] || 'English' }],
                provider: {
                    id: `iptv-${channel.id}-${index + 1}`,
                    name: `${item.label} [${item.quality}]`
                }
            };

            if (probe.ok && onStreamVerified) {
                onStreamVerified(sourceObj);
            }

            return sourceObj;
        })
    );

    // Prioritize verified working streams sorted by fastest response latency
    const verifiedStreams = probed.filter((s) => s.verified).sort((a, b) => (a.latencyMs || 9999) - (b.latencyMs || 9999));
    const finalSources = verifiedStreams.length > 0 ? verifiedStreams : probed;

    return {
        channel,
        sources: finalSources
    };
}

/**
 * Live Sports Events Scraper (ESPN Scoreboard API + Smart beIN/Fox/ESPN/Sky/TNT Channel Mapper)
 */
let cachedEvents: LiveSportEvent[] = [];
let lastEventsFetchTime = 0;
const EVENTS_TTL_MS = 90 * 1000; // 90 seconds cache for live scores

export async function getLiveSportEvents(
    publicBaseUrl: string,
    filters?: { sport?: string; status?: string }
): Promise<LiveSportEvent[]> {
    if (Date.now() - lastEventsFetchTime < EVENTS_TTL_MS && cachedEvents.length > 0) {
        return filterEvents(cachedEvents, filters);
    }

    const leagues = [
        { sport: 'soccer', slug: 'uefa.champions', label: 'UEFA Champions League', defaultChannels: ['bein-sports-1-ar', 'bein-sports-en-1', 'bein-sports-fr-1', 'tnt-sports-1'] },
        { sport: 'soccer', slug: 'uefa.europa', label: 'UEFA Europa League', defaultChannels: ['bein-sports-2-ar', 'bein-sports-en-2', 'bein-sports-fr-2', 'tnt-sports-2'] },
        { sport: 'soccer', slug: 'eng.1', label: 'English Premier League', defaultChannels: ['bein-sports-1-ar', 'bein-sports-2-ar', 'sky-sports-premier-league', 'tnt-sports-1'] },
        { sport: 'soccer', slug: 'esp.1', label: 'Spanish LaLiga', defaultChannels: ['bein-sports-3-ar', 'bein-sports-en-1', 'bein-sports-fr-1', 'espn-hd'] },
        { sport: 'soccer', slug: 'ita.1', label: 'Italian Serie A', defaultChannels: ['bein-sports-4-ar', 'tnt-sports-2', 'bein-sports-fr-2'] },
        { sport: 'soccer', slug: 'ger.1', label: 'German Bundesliga', defaultChannels: ['bein-sports-5-ar', 'bein-sports-fr-2', 'espn-2-hd'] },
        { sport: 'soccer', slug: 'fra.1', label: 'French Ligue 1', defaultChannels: ['bein-sports-6-ar', 'bein-sports-fr-1', 'canal-plus-foot-fr', 'bein-sports-en-2'] },
        { sport: 'basketball', slug: 'nba', label: 'NBA Basketball', defaultChannels: ['bein-sports-en-1', 'bein-sports-fr-3', 'nba-tv', 'espn-hd'] },
        { sport: 'football', slug: 'nfl', label: 'NFL Football', defaultChannels: ['fox-sports-1', 'nfl-network', 'espn-hd', 'sky-sports-main-event'] },
        { sport: 'mma', slug: 'ufc', label: 'UFC / MMA', defaultChannels: ['espn-hd', 'tnt-sports-1', 'rmc-sport-1-fr', 'dazn-combat'] }
    ];

    const events: LiveSportEvent[] = [];

    await Promise.allSettled(
        leagues.map(async (lg) => {
            try {
                const res = await fetch(
                    `https://site.api.espn.com/apis/site/v2/sports/${lg.sport}/${lg.slug}/scoreboard`,
                    {
                        headers: { 'User-Agent': DEFAULT_UA },
                        signal: AbortSignal.timeout(4000)
                    }
                );
                if (!res.ok) return;
                const data = (await res.json()) as any;
                const rawEvents = Array.isArray(data.events) ? data.events : [];
                const leagueLogo = data.leagues?.[0]?.logos?.[0]?.href || '';

                for (const ev of rawEvents) {
                    const comp = ev.competitions?.[0];
                    const competitors = Array.isArray(comp?.competitors) ? comp.competitors : [];
                    const home = competitors.find((c: any) => c.homeAway === 'home') || competitors[0] || {};
                    const away = competitors.find((c: any) => c.homeAway === 'away') || competitors[1] || {};

                    const state = ev.status?.type?.state || 'pre';
                    const status: 'LIVE' | 'UPCOMING' | 'FINISHED' =
                        state === 'in' ? 'LIVE' : state === 'post' ? 'FINISHED' : 'UPCOMING';

                    const broadcasts: string[] = [];
                    if (Array.isArray(comp?.broadcasts)) {
                        for (const b of comp.broadcasts) {
                            if (Array.isArray(b.names)) {
                                broadcasts.push(...b.names);
                            }
                        }
                    }

                    const recIds = new Set<string>(lg.defaultChannels);
                    const bText = broadcasts.join(' ').toLowerCase();
                    if (bText.includes('fox') || bText.includes('fs1')) recIds.add('fox-sports-1');
                    if (bText.includes('espn')) recIds.add('espn-hd');
                    if (bText.includes('sky')) recIds.add('sky-sports-main-event');
                    if (bText.includes('tnt')) recIds.add('tnt-sports-1');
                    if (bText.includes('cbs') || bText.includes('paramount')) recIds.add('cbs-sports-golazo');
                    if (bText.includes('nbc') || bText.includes('peacock')) recIds.add('nbc-sports-now');

                    const recommendedChannels = Array.from(recIds)
                        .map((cid) => CORE_SPORTS_CHANNELS.find((ch) => ch.id === cid))
                        .filter((ch): ch is LiveChannel => Boolean(ch))
                        .map((ch) => ({
                            channelId: ch.id,
                            name: ch.name,
                            language: ch.language,
                            languageLabel: ch.languageLabel,
                            logo: ch.logo,
                            streamEndpoint: `${publicBaseUrl}/v1/live/stream/${ch.id}`
                        }));

                    events.push({
                        id: String(ev.id || `${lg.slug}-${Date.now()}`),
                        title: ev.name || `${away.team?.displayName || 'Away'} vs ${home.team?.displayName || 'Home'}`,
                        shortTitle: ev.shortName || ev.name || '',
                        sport: lg.sport,
                        league: lg.label,
                        leagueSlug: lg.slug,
                        leagueLogo,
                        startTime: ev.date || new Date().toISOString(),
                        status,
                        statusDetail: ev.status?.type?.shortDetail || ev.status?.type?.description || status,
                        homeTeam: {
                            name: home.team?.displayName || home.team?.name || 'Home',
                            shortName: home.team?.abbreviation || home.team?.shortDisplayName || 'HOM',
                            logo: home.team?.logo || '',
                            score: home.score
                        },
                        awayTeam: {
                            name: away.team?.displayName || away.team?.name || 'Away',
                            shortName: away.team?.abbreviation || away.team?.shortDisplayName || 'AWY',
                            logo: away.team?.logo || '',
                            score: away.score
                        },
                        broadcasts: broadcasts.length > 0 ? broadcasts : ['beIN Sports HD', 'International Feed'],
                        recommendedChannels
                    });
                }
            } catch {
                // Ignore individual league error
            }
        })
    );

    events.sort((a, b) => {
        const order = { LIVE: 0, UPCOMING: 1, FINISHED: 2 };
        if (order[a.status] !== order[b.status]) {
            return order[a.status] - order[b.status];
        }
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    if (events.length > 0) {
        cachedEvents = events;
        lastEventsFetchTime = Date.now();
    }

    return filterEvents(events, filters);
}

function filterEvents(events: LiveSportEvent[], filters?: { sport?: string; status?: string }): LiveSportEvent[] {
    let result = [...events];
    if (filters?.sport && filters.sport !== 'all') {
        const s = filters.sport.toLowerCase();
        result = result.filter((e) => e.sport.toLowerCase() === s || e.league.toLowerCase().includes(s));
    }
    if (filters?.status && filters.status !== 'all') {
        const st = filters.status.toUpperCase();
        result = result.filter((e) => e.status === st);
    }
    return result;
}

/**
 * Generates an M3U8 Playlist string for all (or filtered) Live Sports Channels
 */
export function generateSportsM3UPlaylist(
    publicBaseUrl: string,
    options?: { lang?: string; category?: string; useProxy?: boolean }
): string {
    const channels = getLiveChannels(publicBaseUrl, {
        lang: options?.lang,
        category: options?.category
    });

    const lines: string[] = ['#EXTM3U'];
    for (const ch of channels) {
        for (const st of ch.streams) {
            const targetUrl = options?.useProxy
                ? buildLiveProxyUrl(st.url, publicBaseUrl, st.headers)
                : st.url;
            lines.push(
                `#EXTINF:-1 tvg-id="${ch.id}" tvg-name="${ch.name}" tvg-logo="${ch.logo}" tvg-language="${ch.languageLabel}" group-title="${ch.network} (${ch.language.toUpperCase()})",${st.label} [${st.quality}]`
            );
            lines.push(targetUrl);
        }
    }
    return lines.join('\n') + '\n';
}

/**
 * Resolves relative URLs inside an HLS .m3u8 manifest and rewrites them through /v1/live/proxy
 */
export function rewriteLiveHlsManifest(
    manifestContent: string,
    baseUrl: string,
    publicBaseUrl: string,
    headers?: Record<string, string>
): string {
    const lines = manifestContent.split(/\r?\n/);
    const rewritten: string[] = [];

    const resolveRelative = (rel: string): string => {
        if (/^https?:\/\//i.test(rel)) {
            return rel;
        }
        try {
            return new URL(rel, baseUrl).toString();
        } catch {
            return rel;
        }
    };

    const isEdgeParent = /edge\.cowedd4855ws\.sbs/i.test(baseUrl);

    const wrapProxy = (targetUrl: string, isSubManifest: boolean): string => {
        const isTiktokSegment = /tiktokcdn/i.test(targetUrl) || targetUrl.includes('.image');
        const effectiveHeaders = isTiktokSegment && isEdgeParent ? undefined : headers;
        const payload = JSON.stringify({
            url: targetUrl,
            headers: {
                'User-Agent': DEFAULT_UA,
                ...(effectiveHeaders || {})
            }
        });
        const endpoint = isSubManifest ? 'manifest.m3u8' : 'segment.ts';
        return `${publicBaseUrl}/v1/live/proxy/${endpoint}?data=${encodeURIComponent(payload)}`;
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            rewritten.push(line);
            continue;
        }

        if (trimmed.startsWith('#')) {
            if (trimmed.includes('URI="')) {
                const updatedTag = trimmed.replace(/URI="([^"]+)"/g, (_, uriVal) => {
                    const abs = resolveRelative(uriVal);
                    const isM3U = /\.m3u8(\?|$)/i.test(abs);
                    return `URI="${wrapProxy(abs, isM3U)}"`;
                });
                rewritten.push(updatedTag);
            } else {
                rewritten.push(line);
            }
            continue;
        }

        const absUrl = resolveRelative(trimmed);
        const isSubPlaylist = /\.m3u8(\?|$)/i.test(absUrl);
        rewritten.push(wrapProxy(absUrl, isSubPlaylist));
    }

    return rewritten.join('\n');
}

/**
 * Handles proxying of Live HLS manifests (.m3u8) and MPEG-TS/fMP4 segments (.ts, .tbin, .m4s, .image)
 * Automatically refreshes short-lived Edge CDN tokens on manifest reloads and unwraps disguised PNG/WebP TS segments.
 */
export async function handleLiveHlsProxyRequest(
    encodedData: string,
    publicBaseUrl: string,
    reply: any
): Promise<any> {
    let parsed: { url: string; headers?: Record<string, string> };
    try {
        // Fastify already URL-decodes query parameters once; parse directly first to preserve %2B/%2F/%3D signatures
        parsed = JSON.parse(encodedData);
    } catch {
        parsed = JSON.parse(decodeURIComponent(encodedData));
    }

    if (!parsed?.url) {
        return reply.code(400).send({ error: 'Missing url in proxy data' });
    }

    const resolvedReq = await resolveDynamicManifestUrl(parsed.url, parsed.headers);

    const upstreamRes = await fetch(resolvedReq.url, {
        method: 'GET',
        headers: resolvedReq.headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000)
    });

    if (!upstreamRes.ok) {
        return reply.code(upstreamRes.status).send({ error: `Upstream returned ${upstreamRes.status}` });
    }

    const contentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();
    const isM3U8Url = /\.m3u8(\?|$)/i.test(parsed.url);

    // If it's a playlist or small text manifest, buffer and rewrite segment URLs
    if (isM3U8Url || contentType.includes('mpegurl') || contentType.includes('text/plain')) {
        const buf = Buffer.from(await upstreamRes.arrayBuffer());
        const textPeek = buf.subarray(0, 16).toString('utf8').trim();
        if (textPeek.startsWith('#EXTM3U') || textPeek.startsWith('#EXT')) {
            const rewritten = rewriteLiveHlsManifest(
                buf.toString('utf8'),
                upstreamRes.url || resolvedReq.url,
                publicBaseUrl,
                parsed.headers
            );
            return reply
                .code(200)
                .header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
                .header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                .header('Access-Control-Allow-Origin', '*')
                .send(rewritten);
        }

        const unwrapped = unwrapLiveTsSegment(buf);
        return reply
            .code(200)
            .header('Content-Type', 'video/mp2t')
            .header('Cache-Control', 'public, max-age=60')
            .header('Access-Control-Allow-Origin', '*')
            .send(unwrapped);
    }

    // If segment is hosted on tiktokcdn / image wrapper or has image/octet-stream content-type, buffer & unwrap to pure MPEG-TS
    const needsUnwrap =
        parsed.url.includes('tiktokcdn') ||
        parsed.url.endsWith('.image') ||
        contentType.includes('image/') ||
        contentType.includes('octet-stream');

    if (needsUnwrap) {
        const rawBuf = Buffer.from(await upstreamRes.arrayBuffer());
        const unwrapped = unwrapLiveTsSegment(rawBuf);
        return reply
            .code(200)
            .header('Content-Type', 'video/mp2t')
            .header('Cache-Control', 'public, max-age=60')
            .header('Access-Control-Allow-Origin', '*')
            .send(unwrapped);
    }

    // Stream standard binary video segments (.ts, .m4s, .aac) directly
    if (upstreamRes.body) {
        const nodeStream = Readable.fromWeb(upstreamRes.body as any);
        const segType = contentType || 'video/mp2t';
        return reply
            .code(200)
            .header('Content-Type', segType)
            .header('Cache-Control', 'public, max-age=60')
            .header('Access-Control-Allow-Origin', '*')
            .send(nodeStream);
    }

    const fallbackBuf = unwrapLiveTsSegment(Buffer.from(await upstreamRes.arrayBuffer()));
    return reply
        .code(200)
        .header('Content-Type', 'video/mp2t')
        .header('Access-Control-Allow-Origin', '*')
        .send(fallbackBuf);
}
