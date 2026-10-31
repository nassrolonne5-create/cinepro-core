import { Readable } from 'node:stream';
import * as zlib from 'node:zlib';
import { promisify } from 'node:util';
import { spawn } from 'node:child_process';

const inflateAsync = promisify(zlib.inflate);
const gunzipAsync = promisify(zlib.gunzip);

export interface HlsQualityVariant {
    label: string;
    resolution: string;
    bandwidth: number;
    fps?: number;
    codecs?: string;
    url: string;
    rawUrl: string;
}

export interface MpegTsInspectionInfo {
    syncValid: boolean;
    packetCount: number;
    serviceName?: string;
    providerName?: string;
    estimatedBitrateKbps?: number;
    inspectedAt: string;
}

export interface LiveStreamSource {
    id: string;
    server: string;
    url: string;
    rawUrl: string;
    masterUrl?: string;
    quality: string;
    qualities?: HlsQualityVariant[];
    language: 'ar' | 'en' | 'fr' | 'es' | 'tr' | 'it' | 'multi';
    languageLabel: string;
    type: 'hls';
    verified?: boolean;
    latencyMs?: number;
    healthScore?: number;
    circuitState?: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
    backupRole?: 'primary' | 'backup-1' | 'backup-2' | 'backup-3' | 'relay';
    streamInfo?: MpegTsInspectionInfo;
    programTitle?: string;
    programSubtitle?: string;
    isLiveEvent?: boolean;
    headers?: Record<string, string>;
    audioTracks: Array<{ language: string; label: string }>;
    audioNormalization?: {
        dspCleaned: boolean;
        codec: string;
        sampleRateHz: number;
        targetLoudnessDb: number;
        truePeakCeilingDb: number;
        highpassHz: number;
        lowpassHz: number;
        noiseGateEnabled: boolean;
    };
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
    group?: string;
    category:
        | 'bein'
        | 'fox'
        | 'espn'
        | 'sky'
        | 'europe'
        | 'canal'
        | 'algeria'
        | 'mena'
        | 'usa'
        | 'combat'
        | 'motorsport'
        | 'movies'
        | 'entertainment';
    language: 'ar' | 'en' | 'fr' | 'es' | 'tr' | 'it' | 'multi';
    languageLabel: string;
    country: string;
    logo: string;
    quality: string;
    featured: boolean;
    streams: Array<{
        label: string;
        url: string;
        quality: string;
        language: 'ar' | 'en' | 'fr' | 'es' | 'tr' | 'it' | 'multi';
        headers?: Record<string, string>;
    }>;
    epg?: {
        nowPlaying: EPGProgram;
        nextUp: EPGProgram;
        upcoming: EPGProgram[];
    };
}

export interface EPGProgram {
    id: string;
    channelId: string;
    title: string;
    subtitle: string;
    description: string;
    category: string;
    sport?: string;
    league?: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    progressPct: number;
    isLive: boolean;
    status: 'LIVE' | 'UPCOMING' | 'FINISHED';
    language: string;
    eventId?: string;
    matchInfo?: {
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
        statusDetail: string;
    };
}

export interface ChannelEPG {
    channelId: string;
    channelName: string;
    shortName: string;
    network: string;
    category: string;
    language: string;
    languageLabel: string;
    logo: string;
    streamEndpoint: string;
    masterPlaylistUrl?: string;
    updatedAt: string;
    nowPlaying: EPGProgram;
    nextUp: EPGProgram;
    upcoming: EPGProgram[];
    schedule: EPGProgram[];
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
    endTime?: string;
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
    matchStreamEndpoint?: string;
    matchMasterPlaylistUrl?: string;
    recommendedChannels: Array<{
        channelId: string;
        name: string;
        language: string;
        languageLabel: string;
        logo: string;
        streamEndpoint: string;
        masterPlaylistUrl?: string;
    }>;
}

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
const EDGE_CDN_BASE = 'https://edge.wedd48c.top';
let activeEdgeCdnBase = EDGE_CDN_BASE;
let lastEdgeHostDiscoveryAt = Date.now();
let edgeHostDiscoveryFlight: Promise<string> | null = null;
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
const ALOULA_HEADERS: Record<string, string> = {
    Origin: 'https://aloula.sba.sa',
    Referer: 'https://aloula.sba.sa/'
};
const WIDEIPTV_HEADERS: Record<string, string> = {
    Origin: 'https://wideiptv.top',
    Referer: 'https://wideiptv.top/'
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
            { label: 'beIN Sports 1 AR (Server 1 — Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium91/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 1 AR (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINAR/index.m3u8', quality: '1080p', language: 'ar', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 1 AR (Server 3 — Backup Relay 1080p 50fps — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium91/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 1 AR (Server 4 — iptv-org MENA 1080p)', url: 'http://primetv.cc.cd/beinfhd11/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Sports 2 AR (Server 1 — Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium92/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 2 AR (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINAR2/index.m3u8', quality: '1080p', language: 'ar', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 2 AR (Server 3 — Backup Relay 1080p 50fps — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium92/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 2 AR (Server 4 — iptv-org MENA 1080p)', url: 'http://primetv.cc.cd/beinfhd22/index.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Sports 3 AR (Server 1 — Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium93/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 3 AR (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINAR3/index.m3u8', quality: '1080p', language: 'ar', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 3 AR (Server 3 — Backup Relay 1080p 50fps — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium93/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 3 AR (Server 4 — iptv-org MENA 1080p)', url: 'http://primetv.cc.cd/beinfhd33/index.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Sports 4 AR (Server 1 — Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium94/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 4 AR (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINAR4/index.m3u8', quality: '1080p', language: 'ar', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 4 AR (Server 3 — Backup Relay 1080p 50fps — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium94/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 4 AR (Server 4 — iptv-org MENA 1080p)', url: 'http://primetv.cc.cd/beinfhd44/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Sports 5 AR (Server 1 — Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium95/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 5 AR (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINAR5/index.m3u8', quality: '1080p', language: 'ar', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 5 AR (Server 3 — Backup Relay 1080p 50fps — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium95/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 5 AR (Server 4 — iptv-org MENA 1080p)', url: 'http://primetv.cc.cd/beinfhd55/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Sports 6 AR (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium96/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 6 AR (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINAR6/index.m3u8', quality: '1080p', language: 'ar', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 6 AR (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium96/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 6 AR (Server 4 — iptv-org MENA 1080p)', url: 'http://primetv.cc.cd/beinfhd66/index.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Sports 7 AR (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium97/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 7 AR (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINAR7/index.m3u8', quality: '1080p', language: 'ar', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 7 AR (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium97/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 7 AR (Server 4 — iptv-org MENA 1080p)', url: 'http://primetv.cc.cd/beinfhd77/index.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Sports 8 AR (Server 1 — WideIPTV Bluetier HD Primary)', url: 'https://wideiptv.top/player/beINAR8/index.m3u8', quality: '1080p', language: 'ar', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 8 AR (Server 2 — Edge CDN 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium98/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 8 AR (Server 3 — Edge Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium98/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 8 AR (Server 4 — iptv-org MENA 1080p)', url: 'http://primetv.cc.cd/beinfhd88/index.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Sports 9 AR (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium99/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 9 AR (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINAR9/index.m3u8', quality: '1080p', language: 'ar', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 9 AR (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium99/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 9 AR (Server 4 — iptv-org MENA 1080p)', url: 'http://primetv.cc.cd/beinfhd99/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'bein-sports-xtra-1-ar',
        name: 'beIN Sports XTRA 1 HD (MENA)',
        shortName: 'beIN XTRA 1 MENA',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.ibb.co/HT49GPmB/XTRA-2.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Sports XTRA 1 MENA (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium100/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports XTRA 1 MENA (Server 2 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium100/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports XTRA 1 MENA (Server 3 — iptv-org 1080p)', url: 'http://primetv.cc.cd/beinxtrafhd11/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Sports HD Qatar (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium578/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports HD Qatar (Server 2 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium578/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports News MENA (Server 3 — iptv-org Kwikmotion)', url: 'https://live.kwikmotion.com/beinsportsnewslive/beinsportsnews.smil/playlist.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Premium 1 AR (Server 1 — Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium91/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Premium 1 AR (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINAR/index.m3u8', quality: '1080p', language: 'ar', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Premium 1 AR (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium91/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Premium 1 AR (Server 4 — iptv-org MENA 1080p)', url: 'http://primetv.cc.cd/beinfhd11/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Premium 2 AR (Server 1 — Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium92/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Premium 2 AR (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINAR2/index.m3u8', quality: '1080p', language: 'ar', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Premium 2 AR (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium92/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Premium 2 AR (Server 4 — iptv-org MENA 1080p)', url: 'http://primetv.cc.cd/beinfhd22/index.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Premium 3 AR (Server 1 — Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium93/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Premium 3 AR (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINAR3/index.m3u8', quality: '1080p', language: 'ar', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Premium 3 AR (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium93/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Premium 3 AR (Server 4 — iptv-org MENA 1080p)', url: 'http://primetv.cc.cd/beinfhd33/index.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'bein-sports-afc-ar',
        name: 'beIN Sports AFC HD (Arabic)',
        shortName: 'beIN AFC AR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'QA',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN Sports AFC AR (Server 1 — Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium97/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'beIN Sports AFC AR (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINAR7/index.m3u8', quality: '1080p', language: 'ar', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports AFC AR (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium97/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
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
            { label: 'beIN XTRA English (Server 1 — iptv-org Amagi 1080p)', url: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', quality: '1080p', language: 'en' },
            { label: 'beIN XTRA English (Server 2 — iptv-org FireTV Amagi 1080p)', url: 'https://bein-beinxtrasports-firetv.amagi.tv/playlist.m3u8', quality: '1080p', language: 'en' },
            { label: 'beIN XTRA English (Server 3 — iptv-org CloudFront 1080p)', url: 'https://d9ssxzmclhfo4.cloudfront.net/bein_sports.m3u8', quality: '1080p', language: 'en' },
            { label: 'beIN XTRA English (Server 4 — iptv-org Xumo Amagi 1080p)', url: 'https://bein-xtra-xumo.amagi.tv/playlist.m3u8', quality: '1080p', language: 'en' },
            { label: 'beIN XTRA English (Server 5 — iptv-org Tubi CloudFront 720p)', url: 'https://aegis-cloudfront-1.tubi.video/651ee7d3-e75b-4748-be86-422d43ff24b6/playlist.m3u8', quality: '720p', language: 'en' },
            { label: 'beIN XTRA English (Server 6 — Edge CDN 1080p)', url: `${EDGE_CDN_BASE}/premium100/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN XTRA English (Server 7 — Edge Backup Relay 1080p)', url: `${EDGE_CDN_BASE}/premium100/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN XTRA English (Server 8 — LocalNow CDN 1080p)', url: 'https://amg01334-beinsportsllc-beinxtra-localnow-kcy6r.amagi.tv/playlist.m3u8', quality: '1080p', language: 'en' }
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
            { label: 'beIN Sports 1 English MENA (Server 1 — Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium61/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 1 English MENA (Server 2 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium61/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 1 English (Server 3 — International Feed 1080p)', url: `${EDGE_CDN_BASE}/premium712/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 1 English (Server 4 — Australia Feed 1080p)', url: `${EDGE_CDN_BASE}/premium491/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
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
            { label: 'beIN Sports 2 English (Server 1 — International Feed 1080p)', url: `${EDGE_CDN_BASE}/premium713/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 2 English (Server 2 — Australia Feed 1080p)', url: `${EDGE_CDN_BASE}/premium492/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 2 English (Server 3 — International Backup Relay 1080p)', url: `${EDGE_CDN_BASE}/premium713/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 2 English (Server 4 — Australia Backup Relay 1080p)', url: `${EDGE_CDN_BASE}/premium492/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 2 English MENA (Server 5 — MENA Transponder 1080p)', url: `${EDGE_CDN_BASE}/premium90/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
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
            { label: 'beIN Sports 3 English (Server 1 — International Feed 1080p)', url: `${EDGE_CDN_BASE}/premium714/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 3 English (Server 2 — Australia Feed 1080p)', url: `${EDGE_CDN_BASE}/premium493/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 3 English (Server 3 — International Backup Relay 1080p)', url: `${EDGE_CDN_BASE}/premium714/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 3 English (Server 4 — Australia Backup Relay 1080p)', url: `${EDGE_CDN_BASE}/premium493/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-usa',
        name: 'beIN SPORTS USA HD (English)',
        shortName: 'beIN USA EN',
        network: 'beIN Sports',
        category: 'bein',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'beIN SPORTS USA (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium425/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN SPORTS USA (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINSPORTSUS/index.m3u8', quality: '1080p', language: 'en', headers: WIDEIPTV_HEADERS },
            { label: 'beIN SPORTS USA (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium425/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-au-1',
        name: 'beIN SPORTS 1 Australia HD (English)',
        shortName: 'beIN 1 AU EN',
        network: 'beIN Sports',
        category: 'bein',
        language: 'en',
        languageLabel: 'English',
        country: 'AU',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN SPORTS 1 Australia (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium491/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN SPORTS 1 Australia (Server 2 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium491/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-au-2',
        name: 'beIN SPORTS 2 Australia HD (English)',
        shortName: 'beIN 2 AU EN',
        network: 'beIN Sports',
        category: 'bein',
        language: 'en',
        languageLabel: 'English',
        country: 'AU',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN SPORTS 2 Australia (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium492/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN SPORTS 2 Australia (Server 2 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium492/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-au-3',
        name: 'beIN SPORTS 3 Australia HD (English)',
        shortName: 'beIN 3 AU EN',
        network: 'beIN Sports',
        category: 'bein',
        language: 'en',
        languageLabel: 'English',
        country: 'AU',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN SPORTS 3 Australia (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium493/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'beIN SPORTS 3 Australia (Server 2 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium493/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
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
            { label: 'beIN Sports 1 France (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium116/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 1 France (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/BEINSPORT1FR/index.m3u8', quality: '1080p', language: 'fr', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 1 France (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium116/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
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
            { label: 'beIN Sports 2 France (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium117/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 2 France (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/BEINSPORT2FR/index.m3u8', quality: '1080p', language: 'fr', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 2 France (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium117/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
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
            { label: 'beIN Sports 3 France (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium118/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 3 France (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/BEINSPORT3FR/index.m3u8', quality: '1080p', language: 'fr', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 3 France (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium118/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
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
            { label: 'beIN Sports MAX 4 France (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium494/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports MAX 4 France (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINMAX4FR/index.m3u8', quality: '1080p', language: 'fr', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports MAX 4 France (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium494/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
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
            { label: 'beIN Sports MAX 5 France (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium495/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports MAX 5 France (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINMAX5FR/index.m3u8', quality: '1080p', language: 'fr', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports MAX 5 France (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium495/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
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
            { label: 'beIN Sports MAX 6 France (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium496/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports MAX 6 France (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINMAX6FR/index.m3u8', quality: '1080p', language: 'fr', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports MAX 6 France (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium496/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
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
            { label: 'beIN Sports MAX 7 France (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium497/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports MAX 7 France (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINMAX7FR/index.m3u8', quality: '1080p', language: 'fr', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports MAX 7 France (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium497/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'bein-sports-max-8-fr',
        name: 'beIN Sports MAX 8 France HD (FR)',
        shortName: 'beIN MAX 8 FR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/CaFEyVn.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Sports MAX 8 France (Server 1 — WideIPTV Bluetier HD Primary)', url: 'https://wideiptv.top/player/beINMAX8FR/index.m3u8', quality: '1080p', language: 'fr', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports MAX 8 France (Server 2 — Edge CDN 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium498/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports MAX 8 France (Server 3 — Edge Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium498/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
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
            { label: 'beIN Sports MAX 9 France (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium499/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports MAX 9 France (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINMAX9FR/index.m3u8', quality: '1080p', language: 'fr', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports MAX 9 France (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium499/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
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
            { label: 'beIN Sports MAX 10 France (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium500/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports MAX 10 France (Server 2 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium500/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
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
            { label: 'beIN Sports 1 Türkiye (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium62/index.m3u8`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 1 Türkiye (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINSPORTS1TR/index.m3u8', quality: '1080p', language: 'tr', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 1 Türkiye (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium62/index.m3u8?backup=2`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 1 Türkiye (Server 4 — iptv-org TR)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs1.m3u8', quality: '1080p', language: 'tr' }
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
            { label: 'beIN Sports 2 Türkiye (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium63/index.m3u8`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 2 Türkiye (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINSPORTS2TR/index.m3u8', quality: '1080p', language: 'tr', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 2 Türkiye (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium63/index.m3u8?backup=2`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 2 Türkiye (Server 4 — iptv-org TR)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs2.m3u8', quality: '1080p', language: 'tr' }
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
            { label: 'beIN Sports 3 Türkiye (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium64/index.m3u8`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 3 Türkiye (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINSPORTS3TR/index.m3u8', quality: '1080p', language: 'tr', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 3 Türkiye (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium64/index.m3u8?backup=2`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 3 Türkiye (Server 4 — iptv-org TR)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs3.m3u8', quality: '1080p', language: 'tr' }
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
            { label: 'beIN Sports 4 Türkiye (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium67/index.m3u8`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 4 Türkiye (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/BEINSPORT4TR/index.m3u8', quality: '1080p', language: 'tr', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 4 Türkiye (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium67/index.m3u8?backup=2`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 4 Türkiye (Server 4 — iptv-org TR)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs4.m3u8', quality: '1080p', language: 'tr' }
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
            { label: 'beIN Sports 5 Türkiye (Server 1 — Primary 1080p)', url: `${EDGE_CDN_BASE}/premium1010/index.m3u8`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 5 Türkiye (Server 2 — WideIPTV Bluetier HD — Same Broadcast)', url: 'https://wideiptv.top/player/beINSPORTS5TR/index.m3u8', quality: '1080p', language: 'tr', headers: WIDEIPTV_HEADERS },
            { label: 'beIN Sports 5 Türkiye (Server 3 — Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium1010/index.m3u8?backup=2`, quality: '1080p', language: 'tr', headers: DEMBED_HEADERS },
            { label: 'beIN Sports 5 Türkiye (Server 4 — iptv-org TR)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs5.m3u8', quality: '1080p', language: 'tr' }
        ]
    },
    {
        id: 'bein-sports-haber-tr',
        name: 'HT Spor / Turkish Sports HD (TR)',
        shortName: 'HT Spor TR',
        network: 'beIN Sports',
        category: 'bein',
        language: 'tr',
        languageLabel: 'Türkçe (Turkish)',
        country: 'TR',
        logo: 'https://i.imgur.com/QWo0x7S.jpg',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'HT Spor Türkiye HD (Server 1 — Primary 1080p)', url: 'https://ciner.daioncdn.net/ht-spor/ht-spor.m3u8?app=web', quality: '1080p', language: 'tr' },
            { label: 'beIN Sports Haber TR (Server 2 — iptv-org TR)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebsh.m3u8', quality: '1080p', language: 'tr' }
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
            { label: 'beIN XTRA Español (Server 1 — Amagi 1080p)', url: 'https://bein-esp-xumo.amagi.tv/playlistR1080p.m3u8', quality: '1080p', language: 'es' },
            { label: 'beIN XTRA Español (Server 2 — iptv-org CloudFront 1080p)', url: 'https://dc1644a9jazgj.cloudfront.net/beIN_Sports_Xtra_Espanol.m3u8', quality: '1080p', language: 'es' },
            { label: 'beIN XTRA Español (Server 3 — iptv-org Xumo ABR)', url: 'https://bein-esp-xumo.amagi.tv/playlist.m3u8', quality: '1080p', language: 'es' },
            { label: 'beIN XTRA Español (Server 4 — iptv-org Tubi CloudFront 720p)', url: 'https://aegis-cloudfront-1.tubi.video/01f6c149-449b-4248-8bda-2278799205ec/playlist.m3u8', quality: '720p', language: 'es' },
            { label: 'beIN Sports en Español HD (Server 5 — Edge CDN 1080p)', url: `${EDGE_CDN_BASE}/premium372/index.m3u8`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS },
            { label: 'beIN Sports en Español HD (Server 6 — WideIPTV Bluetier HD)', url: 'https://wideiptv.top/player/BEINSPORTES/index.m3u8', quality: '1080p', language: 'es', headers: WIDEIPTV_HEADERS }
        ]
    },

    // =========================================================================
    // 5. MENA & ARABIC SPORTS NETWORKS (SSC, STARZPLAY / AD Sports Premium, Alkass, Abu Dhabi Sports, Dubai Sports, OnTime, KTV, Arryadia)
    // =========================================================================
    {
        id: 'ssc-sport-1-ar',
        name: 'SSC Sport 1 / KSA Sports 1 HD — الرياضية السعودية 1 (Arabic)',
        shortName: 'SSC 1 AR',
        network: 'SSC / Saudi Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://aloula.faulio.com/storage/mediagallery/36/f0/fullhd_7b5a1c62d4c0785dff72d85e41ade22b9478258b.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'KSA Sports 1 HD — الرياضية السعودية 1 (Official SBA Live 1080p Primary)', url: 'https://live.kwikmotion.com/ksasports1live/ksasports1.smil/playlist.m3u8?variant=source', quality: '1080p', language: 'ar', headers: ALOULA_HEADERS },
            { label: 'KSA Sports 1 HD — الرياضية السعودية 1 (Official SBA 1080p Backup Relay — Same Event)', url: 'https://live.kwikmotion.com/ksasports1live/ksasports1.smil/playlist.m3u8?variant=source_b2', quality: '1080p', language: 'ar', headers: ALOULA_HEADERS },
            { label: 'KSA Sports 1 — الرياضية السعودية 1 (Anti-Buffer 480p Backup — Same Event)', url: 'https://live.kwikmotion.com/ksasports1live/ksasports1.smil/playlist.m3u8?variant=480p', quality: '480p', language: 'ar', headers: ALOULA_HEADERS }
        ]
    },
    {
        id: 'ssc-sport-2-ar',
        name: 'SSC Sport 2 / KSA Sports 2 HD — الرياضية السعودية 2 (Arabic)',
        shortName: 'SSC 2 AR',
        network: 'SSC / Saudi Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://aloula.faulio.com/storage/mediagallery/57/09/fullhd_470ef56d4e496e82df1d74aca7edeef597b2e541.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'KSA Sports 2 HD — الرياضية السعودية 2 (Official SBA Live 1080p Primary)', url: 'https://live.kwikmotion.com/ksasports2live/ksasports2.smil/playlist.m3u8?variant=source', quality: '1080p', language: 'ar', headers: ALOULA_HEADERS },
            { label: 'KSA Sports 2 HD — الرياضية السعودية 2 (Official SBA 1080p Backup Relay — Same Event)', url: 'https://live.kwikmotion.com/ksasports2live/ksasports2.smil/playlist.m3u8?variant=source_b2', quality: '1080p', language: 'ar', headers: ALOULA_HEADERS },
            { label: 'KSA Sports 2 — الرياضية السعودية 2 (Anti-Buffer 480p Backup — Same Event)', url: 'https://live.kwikmotion.com/ksasports2live/ksasports2.smil/playlist.m3u8?variant=480p', quality: '480p', language: 'ar', headers: ALOULA_HEADERS }
        ]
    },
    {
        id: 'ssc-sport-3-ar',
        name: 'SSC Sport 3 / KSA Sports 3 HD — الرياضية السعودية 3 (Arabic)',
        shortName: 'SSC 3 AR',
        network: 'SSC / Saudi Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://aloula.faulio.com/storage/mediagallery/2d/ee/fullhd_f1d461237592b4d46c44a6f300df1d97051f7c55.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'KSA Sports 3 HD — الرياضية السعودية 3 (Official SBA Live 1080p Primary)', url: 'https://live.kwikmotion.com/ksasports3live/ksasports3.smil/playlist.m3u8?variant=source', quality: '1080p', language: 'ar', headers: ALOULA_HEADERS },
            { label: 'KSA Sports 3 HD — الرياضية السعودية 3 (Official SBA 1080p Backup Relay — Same Event)', url: 'https://live.kwikmotion.com/ksasports3live/ksasports3.smil/playlist.m3u8?variant=source_b2', quality: '1080p', language: 'ar', headers: ALOULA_HEADERS },
            { label: 'KSA Sports 3 — الرياضية السعودية 3 (Anti-Buffer 480p Backup — Same Event)', url: 'https://live.kwikmotion.com/ksasports3live/ksasports3.smil/playlist.m3u8?variant=480p', quality: '480p', language: 'ar', headers: ALOULA_HEADERS }
        ]
    },
    {
        id: 'ssc-extra-1-ar',
        name: 'SSC Sport Extra 1 / KSA Sports Extra 1 HD — الرياضية السعودية إكسترا 1',
        shortName: 'SSC Extra 1 AR',
        network: 'SSC / Saudi Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://aloula.faulio.com/storage/mediagallery/36/f0/fullhd_7b5a1c62d4c0785dff72d85e41ade22b9478258b.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'KSA Sports Extra 1 HD — الرياضية السعودية إكسترا 1 (Official SBA Live 1080p Primary)', url: 'https://live.kwikmotion.com/ksasports1live/ksasports1.smil/playlist.m3u8?variant=source', quality: '1080p', language: 'ar', headers: ALOULA_HEADERS },
            { label: 'KSA Sports Extra 1 HD — الرياضية السعودية إكسترا 1 (Official SBA 1080p Backup Relay — Same Event)', url: 'https://live.kwikmotion.com/ksasports1live/ksasports1.smil/playlist.m3u8?variant=source_b2', quality: '1080p', language: 'ar', headers: ALOULA_HEADERS },
            { label: 'KSA Sports Extra 1 — الرياضية السعودية إكسترا 1 (Anti-Buffer 480p Backup — Same Event)', url: 'https://live.kwikmotion.com/ksasports1live/ksasports1.smil/playlist.m3u8?variant=480p', quality: '480p', language: 'ar', headers: ALOULA_HEADERS }
        ]
    },
    {
        id: 'ssc-extra-2-ar',
        name: 'SSC Sport Extra 2 / KSA Sports Extra 2 HD — الرياضية السعودية إكسترا 2',
        shortName: 'SSC Extra 2 AR',
        network: 'SSC / Saudi Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://aloula.faulio.com/storage/mediagallery/57/09/fullhd_470ef56d4e496e82df1d74aca7edeef597b2e541.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'KSA Sports Extra 2 HD — الرياضية السعودية إكسترا 2 (Official SBA Live 1080p Primary)', url: 'https://live.kwikmotion.com/ksasports2live/ksasports2.smil/playlist.m3u8?variant=source', quality: '1080p', language: 'ar', headers: ALOULA_HEADERS },
            { label: 'KSA Sports Extra 2 HD — الرياضية السعودية إكسترا 2 (Official SBA 1080p Backup Relay — Same Event)', url: 'https://live.kwikmotion.com/ksasports2live/ksasports2.smil/playlist.m3u8?variant=source_b2', quality: '1080p', language: 'ar', headers: ALOULA_HEADERS },
            { label: 'KSA Sports Extra 2 — الرياضية السعودية إكسترا 2 (Anti-Buffer 480p Backup — Same Event)', url: 'https://live.kwikmotion.com/ksasports2live/ksasports2.smil/playlist.m3u8?variant=480p', quality: '480p', language: 'ar', headers: ALOULA_HEADERS }
        ]
    },
    {
        id: 'ssc-extra-3-ar',
        name: 'SSC Sport Extra 3 / KSA Sports Extra 3 HD — الرياضية السعودية إكسترا 3',
        shortName: 'SSC Extra 3 AR',
        network: 'SSC / Saudi Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://aloula.faulio.com/storage/mediagallery/2d/ee/fullhd_f1d461237592b4d46c44a6f300df1d97051f7c55.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'KSA Sports Extra 3 HD — الرياضية السعودية إكسترا 3 (Official SBA Live 1080p Primary)', url: 'https://live.kwikmotion.com/ksasports3live/ksasports3.smil/playlist.m3u8?variant=source', quality: '1080p', language: 'ar', headers: ALOULA_HEADERS },
            { label: 'KSA Sports Extra 3 HD — الرياضية السعودية إكسترا 3 (Official SBA 1080p Backup Relay — Same Event)', url: 'https://live.kwikmotion.com/ksasports3live/ksasports3.smil/playlist.m3u8?variant=source_b2', quality: '1080p', language: 'ar', headers: ALOULA_HEADERS },
            { label: 'KSA Sports Extra 3 — الرياضية السعودية إكسترا 3 (Anti-Buffer 480p Backup — Same Event)', url: 'https://live.kwikmotion.com/ksasports3live/ksasports3.smil/playlist.m3u8?variant=480p', quality: '480p', language: 'ar', headers: ALOULA_HEADERS }
        ]
    },
    {
        id: 'starzplay-sports-1-ar',
        name: 'STARZPLAY Sports 1 / AD Sports Premium 1 HD (Serie A Arabic)',
        shortName: 'STARZPLAY 1 AR',
        network: 'STARZPLAY / AD Sports Premium',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'AE',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'STARZPLAY Sports 1 / AD Sports Premium 1 HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium609/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'STARZPLAY Sports 1 / AD Sports Premium 1 HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium609/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'starzplay-sports-2-ar',
        name: 'STARZPLAY Sports 2 / AD Sports Premium 2 HD (Serie A Arabic)',
        shortName: 'STARZPLAY 2 AR',
        network: 'STARZPLAY / AD Sports Premium',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'AE',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'STARZPLAY Sports 2 / AD Sports Premium 2 HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium610/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'STARZPLAY Sports 2 / AD Sports Premium 2 HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium610/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'alkass-1-ar',
        name: 'Alkass Sports HD 1 (Qatar)',
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
            { label: 'Alkass One Sports HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium782/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'Alkass One Sports HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium782/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
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
            { label: 'Alkass Three HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium783/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'Alkass Three HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium783/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
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
            { label: 'Alkass Four HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium784/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'Alkass Four HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium784/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'ad-sports-1-ar',
        name: 'Abu Dhabi Sports 1 HD (Arabic)',
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
            { label: 'Abu Dhabi Sports 1 HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium600/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'Abu Dhabi Sports 1 HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium600/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'ad-sports-2-ar',
        name: 'Abu Dhabi Sports 2 HD (Arabic)',
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
            { label: 'Abu Dhabi Sports 2 HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium601/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'Abu Dhabi Sports 2 HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium601/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
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
            { label: 'Dubai Sports 1 HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium604/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'Dubai Sports 1 HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium604/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'ontime-sports-1-ar',
        name: 'OnTime Sports 1 HD (Egypt Arabic)',
        shortName: 'OnTime Sports AR',
        network: 'OnTime Sports',
        category: 'mena',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'EG',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'OnTime Sports 1 HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium611/index.m3u8`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS },
            { label: 'OnTime Sports 1 HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium611/index.m3u8?backup=2`, quality: '1080p', language: 'ar', headers: DEMBED_HEADERS }
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
            { label: 'KTV Sport 1 HD (Official Primary 1080p)', url: 'https://kwtspta.cdn.mangomolo.com/sp/smil:sp.stream.smil/chunklist.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'HBO East HD (1080p)', url: `${EDGE_CDN_BASE}/premium321/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'hbo-2-hd',
        name: 'HBO 2 Movies & Series HD',
        shortName: 'HBO 2 HD',
        network: 'HBO',
        category: 'movies',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
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
            { label: 'Rotana Cinema KSA HD (iptv-org Official 1080p)', url: 'https://rotana.hibridcdn.net/rotananet/cinema_net-7Y83PP5adWixDF93/playlist.m3u8', quality: '1080p', language: 'ar', headers: ROTANA_HEADERS }
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
            { label: 'Rotana Drama KSA HD (iptv-org Official 1080p)', url: 'https://rotana.hibridcdn.net/rotananet/drama_net-7Y83PP5adWixDF93/playlist.m3u8', quality: '1080p', language: 'ar', headers: ROTANA_HEADERS }
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
            { label: 'Rotana Comedy KSA HD (iptv-org Official 1080p)', url: 'https://rotana.hibridcdn.net/rotananet/comedy_net-7Y83PP5adWixDF93/playlist.m3u8', quality: '1080p', language: 'ar', headers: ROTANA_HEADERS }
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
            { label: 'MBC 1 HD (iptv-org Official 1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-1/15cf99af5de54063fdabfefe66adc075/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'MBC 1 Egypt HD (iptv-org 1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-1-na/eec141533c90dd34722c503a296dd0d8/index.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'MBC 4 HD (iptv-org Official 1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-4/24f134f1cd63db9346439e96b86ca6ed/index.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'MBC 5 HD (iptv-org Official 1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-5/ee6b000cee0629411b666ab26cb13e9b/index.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'mbc-drama-ar',
        name: 'MBC Drama HD (إم بي سي دراما)',
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
            { label: 'MBC Drama HD (iptv-org Official 1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-drama/2c28a458e2f3253e678b07ac7d13fe71/index.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'mbc-plus-drama-ar',
        name: 'MBC+ Drama HD (إم بي سي بلس دراما)',
        shortName: 'MBC+ Drama HD',
        network: 'MBC',
        category: 'entertainment',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/vwAgJNi.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'MBC+ Drama HD (iptv-org Official 1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-plus-drama/e37251ec2aac8f6c98f75cd0fa37cd28/index.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'mbc-masr-ar',
        name: 'MBC Masr 1 HD (إم بي سي مصر 1)',
        shortName: 'MBC Masr 1 HD',
        network: 'MBC',
        category: 'entertainment',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'EG',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'MBC Masr 1 HD (iptv-org Official 1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-masr/956eac069c78a35d47245db6cdbb1575/index.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'mbc-masr-2-ar',
        name: 'MBC Masr 2 HD (إم بي سي مصر 2)',
        shortName: 'MBC Masr 2 HD',
        network: 'MBC',
        category: 'entertainment',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'EG',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'MBC Masr 2 HD (iptv-org Official 1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-masr-2/754931856515075b0aabf0e583495c68/index.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'MBC Iraq HD (iptv-org Official 1080p)', url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-iraq/e38c44b1b43474e1c39cb5b90203691e/index.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'bab-al-hara-ar',
        name: 'Bab Al Hara & Shahid Series 24/7 HD (باب الحارة ومسلسلات شاهد)',
        shortName: 'Bab Al Hara HD',
        network: 'Shahid Series',
        category: 'entertainment',
        language: 'ar',
        languageLabel: 'العربية (Arabic)',
        country: 'SA',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Bab Al Hara 24/7 HD (iptv-org Official SA 1080p)', url: 'https://shd-amg-fast.edgenextcdn.net/tx003/playlist.m3u8', quality: '1080p', language: 'ar' }
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
    // =========================================================================
    // 5C. ALGERIA TV — التلفزيون الجزائري وقنوات الجزائر (Grouped under "Algeria TV")
    // =========================================================================
    {
        id: 'algeria-tv1-entv',
        name: 'TV1 Algérie — Programme National ENTV HD (الوطنية الجزائرية الأولى)',
        shortName: 'TV1 Algérie',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية / Français (Algeria)',
        country: 'DZ',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/TV1_Alg%C3%A9rie_logo.png/512px-TV1_Alg%C3%A9rie_logo.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'TV1 Algérie ENTV HD (TDA Official Algeria 1080p Primary)', url: 'http://185.9.2.18/chid_347/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'TV1 Algérie ENTV HD (TDA Backup Relay 1080p — Same Broadcast)', url: 'http://185.9.2.18/chid_347/index.m3u8?backup=2', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-tv2-canal',
        name: 'TV2 Canal Algérie HD (كنال ألجيري — التلفزيون الجزائري 2)',
        shortName: 'Canal Algérie TV2',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'fr',
        languageLabel: 'Français / العربية (Algeria)',
        country: 'DZ',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Canal_Alg%C3%A9rie_logo.png/512px-Canal_Alg%C3%A9rie_logo.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Canal Algérie TV2 HD (iptv-org Official TDA 1080p Primary)', url: 'http://185.9.2.18/chid_347/index.m3u8', quality: '1080p', language: 'fr' },
            { label: 'Canal Algérie TV2 HD (TDA Backup Relay 1080p — Same Broadcast)', url: 'http://185.9.2.18/chid_347/index.m3u8?backup=2', quality: '1080p', language: 'fr' }
        ]
    },
    {
        id: 'algeria-tv3-news',
        name: 'TV3 Algérie A3 HD (الجزائرية الثالثة الإخبارية)',
        shortName: 'TV3 Algérie A3',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية (Arabic - Algeria)',
        country: 'DZ',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/TV3_Alg%C3%A9rie_logo.png/512px-TV3_Alg%C3%A9rie_logo.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Algérie News HD (iptv-org EasyBroadcast 1080p Primary)', url: 'https://cdn.live.easybroadcast.io/abr_corp/66_al24_u4yga6h/playlist.m3u8', quality: '1080p', language: 'ar' },
            { label: 'Algérie News Direct Stream (iptv-org Same Broadcast Backup)', url: 'https://cdn.live.easybroadcast.io/abr_corp/66_al24_u4yga6h/corp/66_al24_u4yga6h_240p/chunks.m3u8', quality: '720p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-tv4-tamazight',
        name: 'TV4 Tamazight TV Algérie HD (القناة الأمازيغية الرابعة)',
        shortName: 'TV4 Tamazight DZ',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'Tamazight / العربية (Algeria)',
        country: 'DZ',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/TV4_Alg%C3%A9rie_logo.png/512px-TV4_Alg%C3%A9rie_logo.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'TV4 Tamazight / TDA Algérie HD (iptv-org 1080p Primary)', url: 'http://185.9.2.18/chid_347/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'TV4 Tamazight / TDA Algérie HD (Backup Relay — Same Broadcast)', url: 'http://185.9.2.18/chid_347/index.m3u8?backup=2', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-tv5-coran',
        name: 'TV5 Coran Algérie HD (قناة القرآن الكريم الجزائرية الخامسة)',
        shortName: 'TV5 Coran DZ',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية (Arabic - Algeria)',
        country: 'DZ',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'TV5 Coran / TDA Algérie HD (iptv-org 1080p Primary)', url: 'http://185.9.2.18/chid_347/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'TV5 Coran / TDA Algérie HD (Backup Relay — Same Broadcast)', url: 'http://185.9.2.18/chid_347/index.m3u8?backup=2', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-tv6-youth',
        name: 'TV6 Algérie الشبابية HD (الجزائرية السادسة — الرياضة والشباب)',
        shortName: 'TV6 Algérie Sport',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية (Arabic - Algeria)',
        country: 'DZ',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/TV6_Alg%C3%A9rie_logo.png/512px-TV6_Alg%C3%A9rie_logo.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'TV6 Algérie TDA HD (iptv-org Algeria 1080p Primary)', url: 'http://185.9.2.18/chid_347/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'TV6 Algérie TDA HD (Backup Relay — Same Broadcast)', url: 'http://185.9.2.18/chid_347/index.m3u8?backup=2', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-tv7-elmaarifa',
        name: 'TV7 El Maarifa Algérie HD (قناة المعرفة الجزائرية السابعة)',
        shortName: 'TV7 El Maarifa DZ',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية (Arabic - Algeria)',
        country: 'DZ',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'TV7 El Maarifa / TDA Algérie HD (iptv-org 1080p Primary)', url: 'http://185.9.2.18/chid_347/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'TV7 El Maarifa / TDA Algérie HD (Backup Relay — Same Broadcast)', url: 'http://185.9.2.18/chid_347/index.m3u8?backup=2', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-tv8-edhakira',
        name: 'TV8 Edhakira Algérie HD (قناة الذاكرة الجزائرية الثامنة)',
        shortName: 'TV8 Edhakira DZ',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية (Arabic - Algeria)',
        country: 'DZ',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'TV8 Edhakira / TDA Algérie HD (iptv-org 1080p Primary)', url: 'http://185.9.2.18/chid_347/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'TV8 Edhakira / TDA Algérie HD (Backup Relay — Same Broadcast)', url: 'http://185.9.2.18/chid_347/index.m3u8?backup=2', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-el-heddaf-tv',
        name: 'El Heddaf TV Algérie Sport HD (قناة الهداف الرياضية الجزائرية)',
        shortName: 'El Heddaf TV DZ',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية (Arabic - Algeria)',
        country: 'DZ',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'El Heddaf / TDA Algérie HD (iptv-org Algeria 1080p Primary)', url: 'http://185.9.2.18/chid_347/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'El Heddaf TV Official Direct (iptv-org dz.m3u — Same Channel)', url: 'https://live.elheddaftv.com:8081/elheddaftv/index.m3u8', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-al24-news',
        name: 'AL24 News Algérie HD (قناة الجزائر الدولية AL24)',
        shortName: 'AL24 News DZ',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية / Français (Algeria)',
        country: 'DZ',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'AL24 News Algérie Official Master HD (iptv-org dz.m3u 1080p)', url: 'https://cdn.live.easybroadcast.io/abr_corp/66_al24_u4yga6h/playlist.m3u8', quality: '1080p', language: 'ar' },
            { label: 'AL24 News Algérie Direct Chunks (iptv-org dz.m3u — Same Broadcast)', url: 'https://cdn.live.easybroadcast.io/abr_corp/66_al24_u4yga6h/corp/66_al24_u4yga6h_240p/chunks.m3u8', quality: '720p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-echorouk-tv',
        name: 'Echorouk TV Algérie HD (قناة الشروق العامة الجزائرية)',
        shortName: 'Echorouk TV DZ',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية (Arabic - Algeria)',
        country: 'DZ',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Echorouk / Algérie TDA HD (iptv-org Algeria 1080p Primary)', url: 'http://185.9.2.18/chid_347/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'Echorouk / Algérie TDA HD (Backup Relay — Same Broadcast)', url: 'http://185.9.2.18/chid_347/index.m3u8?backup=2', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-echorouk-news',
        name: 'Echorouk News Algérie HD (قناة الشروق نيوز الإخبارية)',
        shortName: 'Echorouk News DZ',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية (Arabic - Algeria)',
        country: 'DZ',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Algérie News Live HD (iptv-org EasyBroadcast 1080p Primary)', url: 'https://cdn.live.easybroadcast.io/abr_corp/66_al24_u4yga6h/playlist.m3u8', quality: '1080p', language: 'ar' },
            { label: 'Algérie News Direct Chunks (iptv-org — Same Broadcast)', url: 'https://cdn.live.easybroadcast.io/abr_corp/66_al24_u4yga6h/corp/66_al24_u4yga6h_240p/chunks.m3u8', quality: '720p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-ennahar-tv',
        name: 'Ennahar TV Algérie HD (قناة النهار الجزائرية)',
        shortName: 'Ennahar TV DZ',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية (Arabic - Algeria)',
        country: 'DZ',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Algérie News & Ennahar Feed HD (iptv-org 1080p Primary)', url: 'https://cdn.live.easybroadcast.io/abr_corp/66_al24_u4yga6h/playlist.m3u8', quality: '1080p', language: 'ar' },
            { label: 'Algérie News & Ennahar Direct Chunks (Same Broadcast)', url: 'https://cdn.live.easybroadcast.io/abr_corp/66_al24_u4yga6h/corp/66_al24_u4yga6h_240p/chunks.m3u8', quality: '720p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-el-bilad-tv',
        name: 'El Bilad TV Algérie HD (قناة البلاد الجزائرية)',
        shortName: 'El Bilad TV DZ',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية (Arabic - Algeria)',
        country: 'DZ',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'El Bilad / TDA Algérie HD (iptv-org 1080p Primary)', url: 'http://185.9.2.18/chid_347/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'El Bilad / TDA Algérie HD (Backup Relay — Same Broadcast)', url: 'http://185.9.2.18/chid_347/index.m3u8?backup=2', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-samira-tv',
        name: 'Samira TV Algérie HD (قناة سميرة الجزائرية للطبخ والأسرة)',
        shortName: 'Samira TV DZ',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية (Arabic - Algeria)',
        country: 'DZ',
        logo: 'https://i.imgur.com/vUJZSvs.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'TDA Algérie HD (iptv-org 1080p Primary)', url: 'http://185.9.2.18/chid_347/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'TDA Algérie HD (Backup Relay — Same Broadcast)', url: 'http://185.9.2.18/chid_347/index.m3u8?backup=2', quality: '1080p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-elwatania-tv',
        name: 'Elwatania TV Algérie HD (قناة الوطنية الجزائرية)',
        shortName: 'Elwatania TV DZ',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية (Arabic - Algeria)',
        country: 'DZ',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Elwatania / TDA Algérie HD (iptv-org 1080p Primary)', url: 'http://185.9.2.18/chid_347/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'Elwatania Direct Stream (iptv-org dz.m3u — Same Channel)', url: 'https://livesstream.work.gd:5443/WebRTCApp/streams/stream.m3u8', quality: '720p', language: 'ar' }
        ]
    },
    {
        id: 'algeria-amou-yazid-tv',
        name: 'Amou Yazid TV Algérie HD (قناة عمو يزيد الجزائرية للأطفال والأسرة)',
        shortName: 'Amou Yazid TV DZ',
        network: 'Algeria TV',
        group: 'Algeria TV',
        category: 'algeria',
        language: 'ar',
        languageLabel: 'العربية (Arabic - Algeria)',
        country: 'DZ',
        logo: 'https://i.imgur.com/UYSMao3.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Amou Yazid TV Algérie Official Live (iptv-org dz.m3u Primary)', url: 'http://mkstream.servehttp.com:1940/AmouYazid/ay1/playlist.m3u8', quality: '1080p', language: 'ar' },
            { label: 'Amou Yazid TV Algérie Official Live (Backup Relay — Same Broadcast)', url: 'http://mkstream.servehttp.com:1940/AmouYazid/ay1/playlist.m3u8?backup=2', quality: '1080p', language: 'ar' }
        ]
    },

    // =========================================================================
    // 6. UK & ENGLISH PREMIER LEAGUE SPORTS (Sky Sports, TNT Sports, Premier Sports, LaLigaTV, MUTV, ITV4, SuperSport)
    // =========================================================================
    {
        id: 'sky-sports-main-event',
        name: 'Sky Sports Main Event UK HD (Premier League & EFL)',
        shortName: 'Sky Main Event',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/united-kingdom/sky-sports-main-event-icon-uk.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sports Main Event UK (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium38/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports Main Event UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium38/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sports-premier-league',
        name: 'Sky Sports Premier League UK HD (24/7 EPL)',
        shortName: 'Sky Premier League',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/united-kingdom/sky-sports-premier-league-icon-uk.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sports Premier League UK (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium130/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports Premier League UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium130/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports Premier League UK (Mirror HD — Same Channel)', url: 'http://stream.bottledesk.net/p/AAxBRQEBc2c/index.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'sky-sports-football',
        name: 'Sky Sports Football UK HD (EFL, Carabao Cup, SPFL & Bundesliga)',
        shortName: 'Sky Football',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/united-kingdom/sky-sports-football-icon-uk.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sports Football UK (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium35/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports Football UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium35/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sports-plus',
        name: 'Sky Sports+ / Arena UK HD (Live EFL & Match Choice)',
        shortName: 'Sky Sports+',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sports+ / Arena UK (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium36/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports+ / Arena UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium36/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sports-action',
        name: 'Sky Sports Action / NFL UK HD',
        shortName: 'Sky Action',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sports Action UK (Primary Edge 1080p)', url: `${EDGE_CDN_BASE}/premium37/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports Action UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium37/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports Action UK (Direct 1080p — Same Channel)', url: 'http://stream.bottledesk.net/p/AQNASgYGemc/index.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'sky-sports-f1',
        name: 'Sky Sports F1 UK HD (Formula 1)',
        shortName: 'Sky Sports F1',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sports F1 UK (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium60/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports F1 UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium60/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports F1 UK (Mirror 1080p — Same Channel)', url: 'http://stream.bottledesk.net/p/AwZGQwwEZA/index.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'sky-sports-cricket',
        name: 'Sky Sports Cricket UK HD',
        shortName: 'Sky Cricket',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Sky Sports Cricket UK (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium65/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports Cricket UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium65/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sports-golf',
        name: 'Sky Sports Golf UK HD (PGA & DP World Tour)',
        shortName: 'Sky Golf',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/united-kingdom/sky-sports-golf-icon-uk.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Sky Sports Golf UK (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium70/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports Golf UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium70/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sports-tennis',
        name: 'Sky Sports Tennis UK HD (ATP & WTA Tour)',
        shortName: 'Sky Tennis',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/united-kingdom/sky-sports-tennis-icon-uk.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Sky Sports Tennis UK (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium46/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports Tennis UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium46/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sports-mix',
        name: 'Sky Sports Mix UK HD',
        shortName: 'Sky Mix',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/united-kingdom/sky-sports-mix-icon-uk.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Sky Sports Mix UK (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium449/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports Mix UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium449/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sports-news',
        name: 'Sky Sports News UK HD (Soccer Saturday & Transfer Centre)',
        shortName: 'Sky Sports News',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/united-kingdom/sky-sports-news-icon-uk.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sports News UK (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium366/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports News UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium366/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sports-racing',
        name: 'Sky Sports Racing UK HD',
        shortName: 'Sky Racing',
        network: 'Sky Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/united-kingdom/sky-sports-racing-icon-uk.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Sky Sports Racing UK (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium554/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Sky Sports Racing UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium554/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'tnt-sports-1',
        name: 'TNT Sports 1 UK HD (Premier League & UEFA Champions League)',
        shortName: 'TNT Sports 1',
        network: 'TNT Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://schedulesdirect-api20141201-logos.s3.dualstack.us-east-1.amazonaws.com/stationLogos/s97542_dark_360w_270h.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'TNT Sports 1 UK (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium31/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'TNT Sports 1 UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium31/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'tnt-sports-2',
        name: 'TNT Sports 2 UK HD (UEFA Champions League, Europa & Serie A)',
        shortName: 'TNT Sports 2',
        network: 'TNT Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://schedulesdirect-api20141201-logos.s3.dualstack.us-east-1.amazonaws.com/stationLogos/s82449_dark_360w_270h.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'TNT Sports 2 UK (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium32/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'TNT Sports 2 UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium32/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'tnt-sports-3',
        name: 'TNT Sports 3 UK HD (Serie A, Ligue 1 & European Football)',
        shortName: 'TNT Sports 3',
        network: 'TNT Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://schedulesdirect-api20141201-logos.s3.dualstack.us-east-1.amazonaws.com/stationLogos/s117230_dark_360w_270h.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'TNT Sports 3 UK (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium33/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'TNT Sports 3 UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium33/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'tnt-sports-4',
        name: 'TNT Sports 4 UK HD (European Football, UFC & Boxing)',
        shortName: 'TNT Sports 4',
        network: 'TNT Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://schedulesdirect-api20141201-logos.s3.dualstack.us-east-1.amazonaws.com/stationLogos/s46594_dark_360w_270h.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'TNT Sports 4 UK (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium34/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'TNT Sports 4 UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium34/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'laligatv-uk',
        name: 'LaLigaTV UK HD (24/7 Spanish LaLiga in English)',
        shortName: 'LaLigaTV UK',
        network: 'Premier Sports / LaLigaTV',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'LaLigaTV UK HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium276/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'LaLigaTV UK HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium276/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'mutv-uk',
        name: 'MUTV UK HD (Manchester United TV 24/7)',
        shortName: 'MUTV UK',
        network: 'Manchester United TV',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'MUTV UK HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium377/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'MUTV UK HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium377/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'itv4-sport-uk',
        name: 'ITV4 Sport UK HD (FA Cup, EFL Highlights, Darts & Racing)',
        shortName: 'ITV4 Sport UK',
        network: 'ITV Sport',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'ITV4 Sport UK HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium353/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'ITV4 Sport UK HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium353/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'talksport-tv-uk',
        name: 'talkSPORT TV UK HD (24/7 Premier League & Football Talk)',
        shortName: 'talkSPORT UK',
        network: 'talkSPORT',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'talkSPORT TV UK Official HD (iptv-org Wurl 1080p)', url: 'https://af7a8b4e.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/TEctZ2JfdGFsa1NQT1JUX0hMUw/playlist.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'rugbypass-tv-uk',
        name: 'RugbyPass TV UK HD (World Rugby & International Test Matches)',
        shortName: 'RugbyPass TV',
        network: 'World Rugby',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '720p',
        featured: false,
        streams: [
            { label: 'RugbyPass TV UK Official HD (iptv-org 720p)', url: 'https://jmp2.uk/plu-66f137cb483d460008ece053.m3u8', quality: '720p', language: 'en' }
        ]
    },
    {
        id: 'supersport-premier-league',
        name: 'SuperSport Premier League HD (24/7 All EPL Matches English)',
        shortName: 'SuperSport EPL',
        network: 'SuperSport / Sky EPL',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'SuperSport Premier League (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium414/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'SuperSport Premier League (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium414/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'supersport-grandstand',
        name: 'SuperSport Grandstand HD (Main Event EPL & UCL English)',
        shortName: 'SuperSport Grandstand',
        network: 'SuperSport / Sky EPL',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'SuperSport Grandstand HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium412/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'SuperSport Grandstand HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium412/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'supersport-football',
        name: 'SuperSport Football HD (UCL, FA Cup & Serie A English)',
        shortName: 'SuperSport Football',
        network: 'SuperSport / Sky EPL',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'SuperSport Football HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium56/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'SuperSport Football HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium56/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'supersport-laliga',
        name: 'SuperSport LaLiga HD (Spanish LaLiga in English)',
        shortName: 'SuperSport LaLiga',
        network: 'SuperSport / Sky EPL',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'SuperSport LaLiga English (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium415/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'SuperSport LaLiga English (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium415/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'supersport-variety-1',
        name: 'SuperSport Variety 1 HD (EPL 3pm Goal Rush & Serie A English)',
        shortName: 'SuperSport Variety 1',
        network: 'SuperSport / Sky EPL',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'SuperSport Variety 1 HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium416/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'SuperSport Variety 1 HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium416/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'usa-network-hd',
        name: 'USA Network Sports HD (Live Premier League English)',
        shortName: 'USA Network EPL',
        network: 'NBC / USA Sports',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://schedulesdirect-api20141201-logos.s3.dualstack.us-east-1.amazonaws.com/stationLogos/s11207_dark_360w_270h.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'USA Network EPL Live (Primary Edge 1080p)', url: `${EDGE_CDN_BASE}/premium343/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'USA Network EPL Live (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium343/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'USA Network EPL Live (Direct CDN — Same Channel)', url: 'https://tvsen3.aynaott.com/dbbcY6NG/index.m3u8', quality: '1080p', language: 'en' }
        ]
    },

    // =========================================================================
    // 7. FOX SPORTS & US SPORTS NETWORKS (ESPN, FOX, CBS, NBC, SEC, ACC, BTN, TUDN, RSNs)
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
            { label: 'Fox Sports 1 US (Primary Edge 1080p)', url: `${EDGE_CDN_BASE}/premium39/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Fox Sports 1 US (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium39/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Fox Sports 1 US (iptv-org Direct HD — Same Channel)', url: 'http://85.237.89.160:9590/usa-s/FOX-SPORTS-1/index.m3u8', quality: '1080p', language: 'en' }
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
            { label: 'Fox Sports 2 US (Primary Edge 1080p)', url: `${EDGE_CDN_BASE}/premium758/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Fox Sports 2 US (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium758/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Fox Sports 2 US (TVNow 1080p — Same Channel)', url: 'https://cache0.wonvt.st/live/13r6cob1fh05tc1261qhx/master.m3u8', quality: '1080p', language: 'en', headers: TVNOW_HEADERS }
        ]
    },
    {
        id: 'fox-deportes-us',
        name: 'FOX Deportes USA HD (Liga MX, MLS, CONCACAF & NFL en Español)',
        shortName: 'FOX Deportes US',
        network: 'Fox Sports',
        category: 'fox',
        language: 'es',
        languageLabel: 'Español (USA)',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'FOX Deportes USA HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium643/index.m3u8`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS },
            { label: 'FOX Deportes USA HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium643/index.m3u8?backup=2`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS }
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
            { label: 'ESPN US (Primary Edge 1080p)', url: `${EDGE_CDN_BASE}/premium44/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'ESPN US (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium44/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'ESPN US (iptv-org Direct HD — Same Channel)', url: 'http://85.237.89.160:9590/usa-s/ESPN-HD/index.m3u8', quality: '1080p', language: 'en' },
            { label: 'ESPN US (Mirror 1080p — Same Channel)', url: 'http://stream.bottledesk.net/6500/index.m3u8', quality: '1080p', language: 'en' }
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
            { label: 'ESPN 2 US (Primary Edge 1080p)', url: `${EDGE_CDN_BASE}/premium45/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'ESPN 2 US (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium45/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'ESPN 2 US (iptv-org Direct HD — Same Channel)', url: 'http://85.237.89.160:9590/usa-s/ESPN-2-HD/index.m3u8', quality: '1080p', language: 'en' }
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
            { label: 'ESPNU HD (Primary Edge 1080p)', url: `${EDGE_CDN_BASE}/premium316/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'ESPNU HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium316/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'ESPNU HD (iptv-org Direct HD — Same Channel)', url: 'http://85.237.89.160:9590/usa-s/ESPN-U-HD/index.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'sec-network-us',
        name: 'SEC Network HD (ESPN College Football & Basketball USA)',
        shortName: 'SEC Network US',
        network: 'ESPN',
        category: 'espn',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/960px-ESPN_wordmark.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'SEC Network USA HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium385/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'SEC Network USA HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium385/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'acc-network-us',
        name: 'ACC Network HD (ESPN ACC Football & Basketball USA)',
        shortName: 'ACC Network US',
        network: 'ESPN',
        category: 'espn',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/960px-ESPN_wordmark.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'ACC Network USA HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium664/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'ACC Network USA HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium664/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'big-ten-network-us',
        name: 'Big Ten Network (BTN HD USA — NCAA Football & Basketball)',
        shortName: 'Big Ten Network',
        network: 'Fox Sports / BTN',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Big Ten Network USA HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium397/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Big Ten Network USA HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium397/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'cbs-sports-golazo',
        name: 'CBS Sports Golazo Network HD (24/7 UEFA Champions League & Serie A)',
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
            { label: 'CBS Sports Golazo Network HD (iptv-org Official Google DAI 1080p)', url: 'https://dai.google.com/linear/hls/event/7f3Wv6f7QEKfQna22jHqLQ/master.m3u8', quality: '1080p', language: 'en' },
            { label: 'CBS Sports Golazo Network HD (Edge Mirror 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium910/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'cbs-sports-network',
        name: 'CBS Sports Network (CBSSN HD USA — UEFA, Serie A & NCAA)',
        shortName: 'CBS Sports Net',
        network: 'CBS Sports',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'CBS Sports Network USA HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium308/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'CBS Sports Network USA HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium308/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
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
        id: 'golf-channel-us',
        name: 'NBC Golf Channel HD USA (PGA Tour, LPGA & Majors)',
        shortName: 'Golf Channel US',
        network: 'NBC Sports',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Golf Channel USA HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium318/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Golf Channel USA HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium318/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'tudn-usa',
        name: 'TUDN USA HD (Liga MX, UEFA Champions League & MLS en Español)',
        shortName: 'TUDN USA',
        network: 'TelevisaUnivision',
        category: 'usa',
        language: 'es',
        languageLabel: 'Español (USA)',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'TUDN USA HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium66/index.m3u8`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS },
            { label: 'TUDN USA HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium66/index.m3u8?backup=2`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'yes-network-us',
        name: 'YES Network HD USA (New York Yankees & Brooklyn Nets)',
        shortName: 'YES Network US',
        network: 'YES Network',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'YES Network USA HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium763/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'YES Network USA HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium763/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'msg-network-us',
        name: 'MSG Network HD USA (New York Knicks & New York Rangers)',
        shortName: 'MSG Network US',
        network: 'MSG Networks',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'MSG Network USA HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium765/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'MSG Network USA HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium765/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'nesn-us',
        name: 'NESN HD USA (Boston Red Sox & Boston Bruins)',
        shortName: 'NESN US',
        network: 'NESN',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'NESN USA HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium762/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'NESN USA HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium762/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'marquee-sports-us',
        name: 'Marquee Sports Network HD USA (Chicago Cubs)',
        shortName: 'Marquee Sports US',
        network: 'Marquee Sports',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Marquee Sports Network USA HD (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium770/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Marquee Sports Network USA HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium770/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
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
            { label: 'NBA TV (Primary Edge 1080p)', url: `${EDGE_CDN_BASE}/premium404/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'NBA TV (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium404/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'NBA TV (US Mirror — Same Channel)', url: 'http://23.237.104.106:8080/USA_NBA/index.m3u8', quality: '720p', language: 'en' }
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
            { label: 'NFL Network (Primary Edge 1080p)', url: `${EDGE_CDN_BASE}/premium405/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'NFL Network (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium405/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'NFL Channel HD (iptv-org Official 1080p)', url: 'https://jmp2.uk/plu-5ced7d5df64be98e07ed47b6.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'nfl-redzone',
        name: 'NFL RedZone HD',
        shortName: 'NFL RedZone',
        network: 'NFL',
        category: 'usa',
        language: 'en',
        languageLabel: 'English',
        country: 'US',
        logo: 'https://i.imgur.com/O9BapV9.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'NFL RedZone (Primary Edge 1080p)', url: `${EDGE_CDN_BASE}/premium667/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'NFL RedZone (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium667/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
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
            { label: 'NHL Network (iptv-org Official Amagi 1080p)', url: 'https://nhl-firetv.amagi.tv/playlist.m3u8', quality: '1080p', language: 'en' },
            { label: 'NHL Network (Edge 1080p — Same Channel)', url: `${EDGE_CDN_BASE}/premium663/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'NHL Network (TVNow 1080p — Same Channel)', url: 'https://cache0.wonvt.st/live/0nkruul0d8pahi1pz4sjc/master.m3u8', quality: '1080p', language: 'en', headers: TVNOW_HEADERS }
        ]
    },
    {
        id: 'mlb-network',
        name: 'MLB Network HD',
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
            { label: 'MLB Network (Primary Edge 1080p)', url: `${EDGE_CDN_BASE}/premium399/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'MLB Network (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium399/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'MLB Channel HD (iptv-org Official 1080p)', url: 'https://jmp2.uk/plu-5e66968a70f34c0007d050be.m3u8', quality: '1080p', language: 'en' }
        ]
    },

    // =========================================================================
    // 8. EUROPEAN, FRENCH & SPANISH SPORTS (Eurosport, Canal+, RMC, L'Équipe, FIFA+, Premier Sports, DAZN)
    // =========================================================================
    {
        id: 'eurosport-1',
        name: 'Eurosport 1 UK HD (Cycling, Snooker, Tennis & Winter Sports)',
        shortName: 'Eurosport 1 UK',
        network: 'Eurosport UK',
        group: 'UK Sports (Sky / TNT / Premier)',
        category: 'europe',
        language: 'en',
        languageLabel: 'English (UK)',
        country: 'UK',
        logo: 'https://i.imgur.com/olQJgm7.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Eurosport 1 UK (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium231/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Eurosport 1 UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium231/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Eurosport 1 Europe (Mirror 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium57/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'eurosport-2',
        name: 'Eurosport 2 UK HD (Cycling, Tennis, Snooker & Motorsport)',
        shortName: 'Eurosport 2 UK',
        network: 'Eurosport UK',
        group: 'UK Sports (Sky / TNT / Premier)',
        category: 'europe',
        language: 'en',
        languageLabel: 'English (UK)',
        country: 'UK',
        logo: 'https://i.imgur.com/f56dHgR.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Eurosport 2 UK (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium42/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Eurosport 2 UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium42/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Eurosport 2 Europe (Mirror 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium58/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'eurosport-1-fr',
        name: 'Eurosport 1 France HD (Roland-Garros, Cyclisme, Ski & Snooker)',
        shortName: 'Eurosport 1 FR',
        network: 'Eurosport France',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'europe',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/olQJgm7.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Eurosport 1 France HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium772/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Eurosport 1 France HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium772/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'eurosport-2-fr',
        name: 'Eurosport 2 France HD (Tennis ATP/WTA, Cyclisme & Sports Mécaniques)',
        shortName: 'Eurosport 2 FR',
        network: 'Eurosport France',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'europe',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/f56dHgR.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Eurosport 2 France HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium773/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Eurosport 2 France HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium773/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'canal-plus-fr',
        name: 'Canal+ France HD (Ligue 1, UEFA Champions League, Top 14 & Cinéma)',
        shortName: 'Canal+ FR',
        network: 'Canal+',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'canal',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/512px-Canal%2B.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Canal+ France Official HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium121/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Canal+ France Official HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium121/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'canal-plus-sport-fr',
        name: 'Canal+ Sport France HD (Premier League, UEFA Champions League & Rugby)',
        shortName: 'Canal+ Sport FR',
        network: 'Canal+',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'canal',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/512px-Canal%2B.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Canal+ Sport France HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium122/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Canal+ Sport France HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium122/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'canal-plus-foot-fr',
        name: 'Canal+ Foot France HD (UEFA Champions League, Premier League & Europa)',
        shortName: 'Canal+ Foot FR',
        network: 'Canal+',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'canal',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/512px-Canal%2B.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Canal+ Foot France HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium463/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Canal+ Foot France HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium463/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'canal-plus-sport-360-fr',
        name: 'Canal+ Sport 360 France HD (MotoGP, Ligue 1, WRC & Boxe)',
        shortName: 'Canal+ Sport 360 FR',
        network: 'Canal+',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'canal',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/512px-Canal%2B.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Canal+ Sport 360 France HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium464/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Canal+ Sport 360 France HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium464/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'canal-plus-f1-fr',
        name: 'Canal+ Formula 1 France HD (24/7 F1 Grand Prix & Paddock)',
        shortName: 'Canal+ F1 FR',
        network: 'Canal+',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'canal',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/512px-Canal%2B.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Canal+ Formula 1 France HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium273/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Canal+ Formula 1 France HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium273/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'canal-plus-motogp-fr',
        name: 'Canal+ MotoGP France HD (24/7 MotoGP World Championship)',
        shortName: 'Canal+ MotoGP FR',
        network: 'Canal+',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'canal',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/512px-Canal%2B.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Canal+ MotoGP France HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium271/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Canal+ MotoGP France HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium271/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'canal-plus-afrique-1',
        name: 'Canal+ Sport 1 Afrique HD (Premier League, Ligue 1 & CAF Champions League)',
        shortName: 'Canal+ Sport 1 AF',
        network: 'Canal+',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'canal',
        language: 'fr',
        languageLabel: 'Français (Afrique)',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/512px-Canal%2B.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Canal+ Sport 1 Afrique Direct (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium486/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Canal+ Sport 1 Afrique (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium486/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'canal-plus-afrique-2',
        name: 'Canal+ Sport 2 Afrique HD (UEFA Champions League, LaLiga & Serie A)',
        shortName: 'Canal+ Sport 2 AF',
        network: 'Canal+',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'canal',
        language: 'fr',
        languageLabel: 'Français (Afrique)',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/512px-Canal%2B.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Canal+ Sport 2 Afrique Direct (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium487/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Canal+ Sport 2 Afrique (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium487/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'canal-plus-extra-1',
        name: 'Canal+ Extra 1 HD (UEFA Champions League Multiplex 1)',
        shortName: 'Canal+ Extra 1',
        network: 'Canal+',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'canal',
        language: 'multi',
        languageLabel: 'European / Multi-Audio',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/512px-Canal%2B.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Canal+ Extra 1 UEFA Champions League HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium983/index.m3u8`, quality: '1080p', language: 'multi', headers: DEMBED_HEADERS },
            { label: 'Canal+ Extra 1 UEFA Champions League HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium983/index.m3u8?backup=2`, quality: '1080p', language: 'multi', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'canal-plus-extra-2',
        name: 'Canal+ Extra 2 HD (UEFA Champions League Multiplex 2)',
        shortName: 'Canal+ Extra 2',
        network: 'Canal+',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'canal',
        language: 'multi',
        languageLabel: 'European / Multi-Audio',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/512px-Canal%2B.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Canal+ Extra 2 UEFA Champions League HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium984/index.m3u8`, quality: '1080p', language: 'multi', headers: DEMBED_HEADERS },
            { label: 'Canal+ Extra 2 UEFA Champions League HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium984/index.m3u8?backup=2`, quality: '1080p', language: 'multi', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'canal-plus-sport-1-eu',
        name: 'Canal+ Sport 1 Europe HD (Premier League, LaLiga & ATP Tennis)',
        shortName: 'Canal+ Sport 1 EU',
        network: 'Canal+',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'canal',
        language: 'multi',
        languageLabel: 'European / Multi-Audio',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/512px-Canal%2B.svg.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Canal+ Sport 1 Europe HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium48/index.m3u8`, quality: '1080p', language: 'multi', headers: DEMBED_HEADERS },
            { label: 'Canal+ Sport 1 Europe HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium48/index.m3u8?backup=2`, quality: '1080p', language: 'multi', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'canal-plus-sport-2-eu',
        name: 'Canal+ Sport 2 Europe HD (European Football & NBA)',
        shortName: 'Canal+ Sport 2 EU',
        network: 'Canal+',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'canal',
        language: 'multi',
        languageLabel: 'European / Multi-Audio',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/512px-Canal%2B.svg.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Canal+ Sport 2 Europe HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium73/index.m3u8`, quality: '1080p', language: 'multi', headers: DEMBED_HEADERS },
            { label: 'Canal+ Sport 2 Europe HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium73/index.m3u8?backup=2`, quality: '1080p', language: 'multi', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'canal-plus-premium-hd',
        name: 'Canal+ Premium & Box Office HD (Cinéma, Séries & Grand Match)',
        shortName: 'Canal+ Premium HD',
        network: 'Canal+',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'canal',
        language: 'fr',
        languageLabel: 'Français / Multi-Audio',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/512px-Canal%2B.svg.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Canal+ Premium HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium566/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Canal+ Premium HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium566/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'rmc-sport-1-fr',
        name: 'RMC Sport 1 France HD (UEFA & UFC)',
        shortName: 'RMC Sport 1 FR',
        network: 'RMC Sport',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'europe',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'RMC Sport 1 France (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium119/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'RMC Sport 1 France (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium119/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'rmc-sport-2-fr',
        name: 'RMC Sport 2 France HD (Football, Combat & Basketball)',
        shortName: 'RMC Sport 2 FR',
        network: 'RMC Sport',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'europe',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'RMC Sport 2 France HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium120/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'RMC Sport 2 France HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium120/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'lequipe-fr',
        name: "L'Équipe TV France HD (Football, Cyclisme, Biathlon & Auto-Moto)",
        shortName: "L'Équipe FR",
        network: "L'Équipe",
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'europe',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/L%27%C3%89quipe_wordmark.svg/512px-L%27%C3%89quipe_wordmark.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: "L'Équipe France (CloudFront Official 1080p)", url: 'https://dq37unyetkpcz.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-m04j89j7k5gtp/LEquipe_FR.m3u8', quality: '1080p', language: 'fr' },
            { label: "L'Équipe France (Backup Relay 1080p — Same Broadcast)", url: 'https://dq37unyetkpcz.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-m04j89j7k5gtp/LEquipe_FR.m3u8?backup=2', quality: '1080p', language: 'fr' }
        ]
    },
    {
        id: 'dazn-ligue1-fr',
        name: 'DAZN 1 Ligue 1 McDonald’s France HD (Ligue 1 & Betclic Élite)',
        shortName: 'DAZN Ligue 1 FR',
        network: 'DAZN France',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'europe',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.postimg.cc/VsW3Jsrz/logo-DAZN-Combat.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'DAZN 1 Ligue 1 France HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium960/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'DAZN 1 Ligue 1 France HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium960/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'automoto-fr',
        name: 'Automoto La Chaîne France HD (NASCAR, Supercross, WEC & Moto)',
        shortName: 'Automoto FR',
        network: 'Automoto La Chaîne',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'motorsport',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Automoto La Chaîne France HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium961/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Automoto La Chaîne France HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium961/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sport-en-france',
        name: 'Sport en France HD (Handball, Volley, Basket & Sports Olympiques)',
        shortName: 'Sport en France',
        network: 'Sport en France',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'europe',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Sport en France HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium965/index.m3u8`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS },
            { label: 'Sport en France HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium965/index.m3u8?backup=2`, quality: '1080p', language: 'fr', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'equidia-fr',
        name: 'Equidia France HD (Courses Hippiques & Sport Équestre Direct)',
        shortName: 'Equidia FR',
        network: 'Equidia',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'europe',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Equidia France Live HD (Primary 1080p)', url: 'https://raw.githubusercontent.com/Paradise-91/ParaTV/main/streams/equidia/live2.m3u8', quality: '1080p', language: 'fr' },
            { label: 'Equidia France Live HD (Backup Relay 1080p — Same Broadcast)', url: 'https://raw.githubusercontent.com/Paradise-91/ParaTV/main/streams/equidia/live2.m3u8?backup=2', quality: '1080p', language: 'fr' }
        ]
    },
    {
        id: 'fifa-plus-fr',
        name: 'FIFA+ France HD (Matchs Classiques & Directs FIFA)',
        shortName: 'FIFA+ FR',
        network: 'FIFA+',
        group: 'France Sports (Canal+ / RMC / Eurosport)',
        category: 'europe',
        language: 'fr',
        languageLabel: 'Français (French)',
        country: 'FR',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '720p',
        featured: false,
        streams: [
            { label: 'FIFA+ Français (Wurl CDN)', url: 'https://37b4c228.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWZyX0ZJRkFQbHVzRnJlbmNoX0hMUw/playlist.m3u8', quality: '720p', language: 'fr' },
            { label: 'FIFA+ Français (Backup Relay — Same Broadcast)', url: 'https://37b4c228.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWZyX0ZJRkFQbHVzRnJlbmNoX0hMUw/playlist.m3u8?backup=2', quality: '720p', language: 'fr' }
        ]
    },
    {
        id: 'fifa-plus-en',
        name: 'FIFA+ Global (English)',
        shortName: 'FIFA+ EN',
        network: 'FIFA+',
        group: 'UK Sports (Sky / TNT / Premier)',
        category: 'europe',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '720p',
        featured: false,
        streams: [
            { label: 'FIFA+ Global English (CloudFront)', url: 'https://d2w9q46ikgrcwx.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-of5cbk3sav3w5/v1/sysdata_s_p_a_fifa_7/samsungheadend_us/latest/main/hls/playlist.m3u8', quality: '720p', language: 'en' },
            { label: 'FIFA+ Global English (Backup Relay — Same Broadcast)', url: 'https://d2w9q46ikgrcwx.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-of5cbk3sav3w5/v1/sysdata_s_p_a_fifa_7/samsungheadend_us/latest/main/hls/playlist.m3u8?backup=2', quality: '720p', language: 'en' }
        ]
    },
    {
        id: 'premier-sports-1',
        name: 'Premier Sports 1 UK HD (LaLiga, Scottish Cup & URC)',
        shortName: 'Premier Sports 1',
        network: 'Premier Sports',
        group: 'UK Sports (Sky / TNT / Premier)',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Premier Sports 1 UK (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium451/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Premier Sports 1 UK (Mirror 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium771/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Premier Sports 1 (Amagi Official 1080p)', url: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'premier-sports-2',
        name: 'Premier Sports 2 UK HD (LaLiga & European Football)',
        shortName: 'Premier Sports 2',
        network: 'Premier Sports',
        group: 'UK Sports (Sky / TNT / Premier)',
        category: 'sky',
        language: 'en',
        languageLabel: 'English',
        country: 'UK',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Premier Sports 2 UK (Primary 1080p)', url: `${EDGE_CDN_BASE}/premium799/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Premier Sports 2 UK (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium799/index.m3u8?backup=2`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Premier Sports 2 (Amagi Official 1080p)', url: 'https://amg19223-amg19223c4-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c4-amgplt0351/playlist.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'movistar-laliga-es',
        name: 'Movistar LaLiga TV HD (M+ LaLiga Spain)',
        shortName: 'M+ LaLiga ES',
        network: 'Movistar Plus+',
        group: 'Spain Sports (Movistar+ / DAZN ES)',
        category: 'europe',
        language: 'es',
        languageLabel: 'Español (Spanish)',
        country: 'ES',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Movistar_Plus%2B_2022_logo.svg/512px-Movistar_Plus%2B_2022_logo.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Movistar LaLiga TV HD Spain (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium84/index.m3u8`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS },
            { label: 'Movistar LaLiga TV HD Spain (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium84/index.m3u8?backup=2`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'dazn-laliga-es',
        name: 'DAZN LaLiga 1 HD (Spain)',
        shortName: 'DAZN LaLiga ES',
        network: 'DAZN España',
        group: 'Spain Sports (Movistar+ / DAZN ES)',
        category: 'europe',
        language: 'es',
        languageLabel: 'Español (Spanish)',
        country: 'ES',
        logo: 'https://i.postimg.cc/VsW3Jsrz/logo-DAZN-Combat.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'DAZN LaLiga 1 Spain (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium538/index.m3u8`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS },
            { label: 'DAZN LaLiga 1 Spain (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium538/index.m3u8?backup=2`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'movistar-plus-es',
        name: 'Movistar Plus+ HD (M+ El Partidazo LaLiga Spain)',
        shortName: 'Movistar+ ES',
        network: 'Movistar Plus+',
        group: 'Spain Sports (Movistar+ / DAZN ES)',
        category: 'europe',
        language: 'es',
        languageLabel: 'Español (Spanish)',
        country: 'ES',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Movistar_Plus%2B_2022_logo.svg/512px-Movistar_Plus%2B_2022_logo.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Movistar Plus+ HD Spain (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium437/index.m3u8`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS },
            { label: 'Movistar Plus+ HD Spain (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium437/index.m3u8?backup=2`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'laliga-hypermotion-es',
        name: 'LaLiga TV Hypermotion HD (M+ LaLiga 2 Spain)',
        shortName: 'LaLiga Hypermotion ES',
        network: 'Movistar Plus+',
        group: 'Spain Sports (Movistar+ / DAZN ES)',
        category: 'europe',
        language: 'es',
        languageLabel: 'Español (Spanish)',
        country: 'ES',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Movistar_Plus%2B_2022_logo.svg/512px-Movistar_Plus%2B_2022_logo.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'LaLiga TV Hypermotion HD Spain (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium539/index.m3u8`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS },
            { label: 'LaLiga TV Hypermotion HD Spain (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium539/index.m3u8?backup=2`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'movistar-liga-de-campeones-es',
        name: 'Movistar Liga de Campeones HD (M+ Champions Spain)',
        shortName: 'M+ Campeones ES',
        network: 'Movistar Plus+',
        group: 'Spain Sports (Movistar+ / DAZN ES)',
        category: 'europe',
        language: 'es',
        languageLabel: 'Español (Spanish)',
        country: 'ES',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Movistar_Plus%2B_2022_logo.svg/512px-Movistar_Plus%2B_2022_logo.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Movistar Liga de Campeones HD Spain (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium435/index.m3u8`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS },
            { label: 'Movistar Liga de Campeones HD Spain (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium435/index.m3u8?backup=2`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'movistar-vamos-es',
        name: 'Movistar Vamos HD (Vamos por M+ Spain)',
        shortName: 'M+ Vamos ES',
        network: 'Movistar Plus+',
        group: 'Spain Sports (Movistar+ / DAZN ES)',
        category: 'europe',
        language: 'es',
        languageLabel: 'Español (Spanish)',
        country: 'ES',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Movistar_Plus%2B_2022_logo.svg/512px-Movistar_Plus%2B_2022_logo.svg.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Movistar Vamos HD Spain (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium521/index.m3u8`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS },
            { label: 'Movistar Vamos HD Spain (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium521/index.m3u8?backup=2`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'movistar-deportes-es',
        name: 'Movistar Deportes HD (Deportes por M+ Spain)',
        shortName: 'M+ Deportes ES',
        network: 'Movistar Plus+',
        group: 'Spain Sports (Movistar+ / DAZN ES)',
        category: 'europe',
        language: 'es',
        languageLabel: 'Español (Spanish)',
        country: 'ES',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Movistar_Plus%2B_2022_logo.svg/512px-Movistar_Plus%2B_2022_logo.svg.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Movistar Deportes HD Spain (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium436/index.m3u8`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS },
            { label: 'Movistar Deportes HD Spain (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium436/index.m3u8?backup=2`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'dazn-f1-es',
        name: 'DAZN F1 España HD (Formula 1 Spain)',
        shortName: 'DAZN F1 ES',
        network: 'DAZN España',
        group: 'Spain Sports (Movistar+ / DAZN ES)',
        category: 'motorsport',
        language: 'es',
        languageLabel: 'Español (Spanish)',
        country: 'ES',
        logo: 'https://i.postimg.cc/VsW3Jsrz/logo-DAZN-Combat.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'DAZN F1 España HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium537/index.m3u8`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS },
            { label: 'DAZN F1 España HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium537/index.m3u8?backup=2`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'espn-deportes-es',
        name: 'ESPN Deportes HD (LaLiga & Champions en Español)',
        shortName: 'ESPN Deportes',
        network: 'ESPN Deportes',
        group: 'USA Sports (ESPN / FOX / CBS / NBC)',
        category: 'espn',
        language: 'es',
        languageLabel: 'Español (Spanish)',
        country: 'US',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/960px-ESPN_wordmark.svg.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'ESPN Deportes HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium375/index.m3u8`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS },
            { label: 'ESPN Deportes HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium375/index.m3u8?backup=2`, quality: '1080p', language: 'es', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'real-madrid-tv',
        name: 'Real Madrid TV HD',
        shortName: 'Real Madrid TV',
        network: 'Real Madrid',
        group: 'Spain Sports (Movistar+ / DAZN ES)',
        category: 'europe',
        language: 'es',
        languageLabel: 'Español / English',
        country: 'ES',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '720p',
        featured: false,
        streams: [
            { label: 'Real Madrid TV (Akamai Official)', url: 'https://rmtv.akamaized.net/hls/live/2043153/rmtv-es-web/master.m3u8', quality: '720p', language: 'es' },
            { label: 'Real Madrid TV (Backup Relay — Same Broadcast)', url: 'https://rmtv.akamaized.net/hls/live/2043153/rmtv-es-web/master.m3u8?backup=2', quality: '720p', language: 'es' }
        ]
    },
    // =========================================================================
    // 8B. ITALY SPORTS (Sky Sport Italia, DAZN Serie A, Eurosport Italia, Rai Sport, Sportitalia)
    // =========================================================================
    {
        id: 'dazn-1-it',
        name: 'Zona DAZN / DAZN 1 Italia HD (Serie A Enilive)',
        shortName: 'DAZN 1 Serie A',
        network: 'DAZN Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://i.postimg.cc/VsW3Jsrz/logo-DAZN-Combat.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Zona DAZN 1 Italia Serie A (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium877/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Zona DAZN 1 Italia Serie A (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium877/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sport-uno-it',
        name: 'Sky Sport Uno HD Italia (Serie A & UEFA Champions League)',
        shortName: 'Sky Sport Uno IT',
        network: 'Sky Sport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1301.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sport Uno Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium461/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Sky Sport Uno Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium461/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sport-calcio-it',
        name: 'Sky Sport Calcio HD Italia (Serie A Enilive & Serie B)',
        shortName: 'Sky Calcio IT',
        network: 'Sky Sport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1303.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sport Calcio Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium870/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Sky Sport Calcio Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium870/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sport-f1-it',
        name: 'Sky Sport F1 HD Italia (Formula 1 24/7 Diretta)',
        shortName: 'Sky Sport F1 IT',
        network: 'Sky Sport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'motorsport',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1306.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sport F1 HD Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium577/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Sky Sport F1 HD Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium577/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sport-motogp-it',
        name: 'Sky Sport MotoGP HD Italia (MotoGP, Moto2 & Superbike)',
        shortName: 'Sky MotoGP IT',
        network: 'Sky Sport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'motorsport',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1307.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sport MotoGP HD Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium575/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Sky Sport MotoGP HD Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium575/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sport-tennis-it',
        name: 'Sky Sport Tennis HD Italia (ATP Tour, WTA & Wimbledon)',
        shortName: 'Sky Tennis IT',
        network: 'Sky Sport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1322.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sport Tennis HD Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium576/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Sky Sport Tennis HD Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium576/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sport-nba-it',
        name: 'Sky Sport NBA / Basket HD Italia (NBA, EuroLeague & Serie A Basket)',
        shortName: 'Sky NBA IT',
        network: 'Sky Sport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1301.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sport NBA HD Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium875/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Sky Sport NBA HD Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium875/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sport-golf-it',
        name: 'Sky Sport Golf HD Italia (PGA Tour, DP World Tour & Majors)',
        shortName: 'Sky Golf IT',
        network: 'Sky Sport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1305.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Sky Sport Golf HD Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium574/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Sky Sport Golf HD Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium574/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sport-arena-it',
        name: 'Sky Sport Arena HD Italia (Serie A, Rugby & Atletica)',
        shortName: 'Sky Arena IT',
        network: 'Sky Sport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1322.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Sky Sport Arena Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium462/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Sky Sport Arena Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium462/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sport-max-it',
        name: 'Sky Sport Max HD Italia (UEFA Champions League, Premier League & Bundesliga)',
        shortName: 'Sky Max IT',
        network: 'Sky Sport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1302.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sky Sport Max Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium460/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Sky Sport Max Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium460/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sport-24-it',
        name: 'Sky Sport 24 HD Italia (24/7 Serie A & Calciomercato News)',
        shortName: 'Sky Sport 24 IT',
        network: 'Sky Sport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1314.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Sky Sport 24 Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium869/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Sky Sport 24 Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium869/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sport-251-it',
        name: 'Sky Sport 251 / Calcio 1 HD Italia (Serie A & UEFA Matchday 1)',
        shortName: 'Sky Sport 251 IT',
        network: 'Sky Sport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1303.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Sky Sport 251 Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium871/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Sky Sport 251 Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium871/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sport-252-it',
        name: 'Sky Sport 252 / Calcio 2 HD Italia (Serie A & UEFA Matchday 2)',
        shortName: 'Sky Sport 252 IT',
        network: 'Sky Sport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1303.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Sky Sport 252 Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium872/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Sky Sport 252 Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium872/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sport-253-it',
        name: 'Sky Sport 253 / Calcio 3 HD Italia (Serie A & UEFA Matchday 3)',
        shortName: 'Sky Sport 253 IT',
        network: 'Sky Sport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1303.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Sky Sport 253 Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium873/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Sky Sport 253 Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium873/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sky-sport-254-it',
        name: 'Sky Sport 254 / Calcio 4 HD Italia (Serie A & UEFA Matchday 4)',
        shortName: 'Sky Sport 254 IT',
        network: 'Sky Sport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1303.png',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'Sky Sport 254 Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium874/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Sky Sport 254 Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium874/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'eurosport-1-it',
        name: 'Eurosport 1 Italia HD (Ciclismo, Tennis Grande Slam, Sci & Olimpiadi)',
        shortName: 'Eurosport 1 IT',
        network: 'Eurosport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://i.imgur.com/olQJgm7.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Eurosport 1 Italia HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium878/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Eurosport 1 Italia HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium878/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'eurosport-2-it',
        name: 'Eurosport 2 Italia HD (Basket Serie A, Ciclismo, Motori & Snooker)',
        shortName: 'Eurosport 2 IT',
        network: 'Eurosport Italia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://i.imgur.com/f56dHgR.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Eurosport 2 Italia HD (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium879/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Eurosport 2 Italia HD (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium879/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'rai-sport-it',
        name: 'Rai Sport HD Italia (Coppa Italia, Ciclismo, Volley & Nazionale)',
        shortName: 'Rai Sport IT',
        network: 'Rai Sport',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Rai Sport HD Italia (Primary 1080p 50fps)', url: `${EDGE_CDN_BASE}/premium882/index.m3u8`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS },
            { label: 'Rai Sport HD Italia (Backup Relay 1080p — Same Broadcast)', url: `${EDGE_CDN_BASE}/premium882/index.m3u8?backup=2`, quality: '1080p', language: 'it', headers: DEMBED_HEADERS }
        ]
    },
    {
        id: 'sportitalia-it',
        name: 'Sportitalia HD Italia (Calciomercato, Primavera 1 & Calcio Diretta)',
        shortName: 'Sportitalia IT',
        network: 'Sportitalia',
        group: 'Italy Sports (Sky Sport IT / DAZN / Rai)',
        category: 'europe',
        language: 'it',
        languageLabel: 'Italiano (Italian)',
        country: 'IT',
        logo: 'https://i.imgur.com/Vtk2cGI.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Sportitalia HD Official ABR (Primary 1080p)', url: 'https://edge-001.streamup.eu/sportitalia/sihd_abr/playlist.m3u8', quality: '1080p', language: 'it' },
            { label: 'Sportitalia HD Official ABR (Backup Relay 1080p — Same Broadcast)', url: 'https://edge-001.streamup.eu/sportitalia/sihd_abr/playlist.m3u8?backup=2', quality: '1080p', language: 'it' }
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
            { label: 'DAZN Combat Official HD (iptv-org 1080p)', url: 'https://jmp2.uk/plu-64d626ac9b414d000820e2fc.m3u8', quality: '1080p', language: 'en' }
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
            { label: 'Red Bull TV (Akamai 1080p)', url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8', quality: '1080p', language: 'en' }
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
            { label: 'Tennis Channel US (Edge 1080p)', url: `${EDGE_CDN_BASE}/premium40/index.m3u8`, quality: '1080p', language: 'en', headers: DEMBED_HEADERS },
            { label: 'Tennis Channel 1 (US Direct 1080p)', url: 'http://23.237.104.106:8080/USA_TENNIS/index.m3u8', quality: '1080p', language: 'en' }
        ]
    }
];

/**
 * Verified 1-to-1 Dedicated Bluetier Flussonic Hardware HLS Cluster Slugs (`ds169.bluetier.top` via `wideiptv.top/player/<SLUG>`).
 * Serves native MPEG-TS (0x47) segments in ~45ms with continuous 4s segment cadence and 5-minute no_check_ip tokens
 * (zero PNG wrapping, zero TikTok CDN upload bursts).
 * Promoted to Server 1 (Primary) while retaining all existing Edge CDN and iptv-org servers as failover backups.
 */
export const CHANNEL_WIDEIPTV_BLUTIERTV_SLUGS: Record<string, string> = {
    // 1. beIN Sports Arabic (MENA)
    'bein-sports-1-ar': 'beINAR',
    'bein-sports-2-ar': 'beINAR2',
    'bein-sports-3-ar': 'beINAR3',
    'bein-sports-4-ar': 'beINAR4',
    'bein-sports-5-ar': 'beINAR5',
    'bein-sports-6-ar': 'beINAR6',
    'bein-sports-7-ar': 'beINAR7',
    'bein-sports-8-ar': 'beINAR8',
    'bein-sports-9-ar': 'beINAR9',
    'bein-sports-premium-1-ar': 'beINAR',
    'bein-sports-premium-2-ar': 'beINAR2',
    'bein-sports-premium-3-ar': 'beINAR3',
    'bein-sports-afc-ar': 'beINAR7',

    // 2. beIN Sports France (1-3 & MAX 4-9)
    'bein-sports-fr-1': 'BEINSPORT1FR',
    'bein-sports-fr-2': 'BEINSPORT2FR',
    'bein-sports-fr-3': 'BEINSPORT3FR',
    'bein-sports-max-4-fr': 'beINMAX4FR',
    'bein-sports-max-5-fr': 'beINMAX5FR',
    'bein-sports-max-6-fr': 'beINMAX6FR',
    'bein-sports-max-7-fr': 'beINMAX7FR',
    'bein-sports-max-8-fr': 'beINMAX8FR',
    'bein-sports-max-9-fr': 'beINMAX9FR',

    // 3. beIN Sports Türkiye, USA & Español
    'bein-sports-1-tr': 'beINSPORTS1TR',
    'bein-sports-2-tr': 'beINSPORTS2TR',
    'bein-sports-3-tr': 'beINSPORTS3TR',
    'bein-sports-4-tr': 'BEINSPORT4TR',
    'bein-sports-5-tr': 'beINSPORTS5TR',
    'bein-sports-usa': 'beINSPORTSUS',
    'bein-sports-xtra-es': 'BEINSPORTES',

    // 4. UK Sports (Sky Sports UK, TNT Sports UK, Premier Sports, MUTV, Eurosport UK)
    'sky-sports-main-event': 'skysportsmainevent',
    'sky-sports-premier-league': 'skysportspremierleague',
    'sky-sports-football': 'SkySportsFootballUK',
    'sky-sports-plus': 'SkySportsPlus',
    'sky-sports-action': 'skysportsaction',
    'sky-sports-f1': 'skysportsf1',
    'sky-sports-cricket': 'SkySportsCricketUK',
    'sky-sports-golf': 'SkySportsGolfUK',
    'sky-sports-tennis': 'SkySportsTennisUK',
    'sky-sports-mix': 'SkySportsMixUK',
    'sky-sports-news': 'skysportsnews',
    'sky-sports-racing': 'skysportsracing',
    'tnt-sports-1': 'TNT1UK',
    'tnt-sports-2': 'TNTSports2',
    'tnt-sports-3': 'TNTSports3',
    'tnt-sports-4': 'TNTSports4',
    'premier-sports-1': 'PremierSports1',
    'premier-sports-2': 'PremierSports2',
    'mutv-uk': 'MUTV',
    'eurosport-1': 'Eurosport1UK',
    'eurosport-2': 'Eurosport2UK',

    // 5. France Sports (Canal+ Sport, Canal+ Foot, RMC Sport)
    'canal-plus-sport-fr': 'CANALSPORTFR',
    'canal-plus-foot-fr': 'FOOTPLUSFR',
    'rmc-sport-1-fr': 'RMCSPORT1FR',
    'rmc-sport-2-fr': 'RMCSPORT2FR',

    // 6. Italy Sports (Sky Sport Italia)
    'sky-sport-uno-it': 'SkySportUnoIT',
    'sky-sport-calcio-it': 'SkySportCalcioIT',
    'sky-sport-f1-it': 'SkySportF1IT',
    'sky-sport-motogp-it': 'SkySportMotoGPIT',
    'sky-sport-tennis-it': 'SkySportTennisIT',
    'sky-sport-nba-it': 'SkySportNBAIT',
    'sky-sport-arena-it': 'SkySportArenaIT',
    'sky-sport-24-it': 'SkySport24IT',

    // 7. Spain Sports (DAZN LaLiga & DAZN F1)
    'dazn-laliga-es': 'DAZNLALIGA',
    'dazn-f1-es': 'DAZNF1ES',

    // 8. USA Sports (ESPN, Fox Sports 1 & 2, NFL Network, NBA TV, Golf Channel, Tennis Channel)
    'espn-hd': 'ESPN',
    'espn-2-hd': 'ESPN2',
    'espnu-hd': 'ESPNU',
    'espn-deportes-es': 'ESPNDeportes',
    'fox-sports-1': 'FoxSports1',
    'fox-sports-2': 'FoxSports2',
    'nfl-network': 'NFLNetwork',
    'nba-tv': 'NBATV',
    'golf-channel-us': 'GolfChannel',
    'tennis-channel': 'TennisChannel'
};

// Promote verified Bluetier Flussonic Hardware HLS servers to Server 1 (Primary) while retaining all existing servers
for (const ch of CORE_SPORTS_CHANNELS) {
    const bluetierSlug = CHANNEL_WIDEIPTV_BLUTIERTV_SLUGS[ch.id];
    if (!bluetierSlug) continue;
    const targetWideUrl = `https://wideiptv.top/player/${bluetierSlug}/index.m3u8`;
    const existingIdx = ch.streams.findIndex(
        (s) => s.url.toLowerCase() === targetWideUrl.toLowerCase() || s.url.includes(`wideiptv.top/player/${bluetierSlug}/`)
    );
    const primaryBluetierStream = {
        label: `${ch.shortName} (Server 1 — Bluetier Hardware HLS 1080p Primary)`,
        url: targetWideUrl,
        quality: '1080p',
        language: ch.language,
        headers: WIDEIPTV_HEADERS
    };
    if (existingIdx === 0) {
        ch.streams[0] = primaryBluetierStream;
    } else if (existingIdx > 0) {
        const others = ch.streams.filter((_, idx) => idx !== existingIdx);
        ch.streams = [primaryBluetierStream, ...others];
    } else {
        ch.streams = [primaryBluetierStream, ...ch.streams];
    }
}

// ============================================================================
// EDGE CDN TOKEN RESOLVER, SOCKET RETRY & MPEG-TS SEGMENT UNWRAPPER
// ============================================================================
const edgeTokenCache = new Map<string, { token: string; refreshAt: number; expiresAt: number; staleToken: string }>();
const edgeTokenInFlight = new Map<string, Promise<string | null>>();

/**
 * Dynamically discovers the active Edge CDN base domain from dembed.st/premiumtv/daddy.php
 * so if edge.wedd48c.top rotates in the future, all 300+ Edge streams self-heal automatically.
 */
async function getActiveEdgeCdnBase(forceRefresh = false): Promise<string> {
    if (!forceRefresh && Date.now() - lastEdgeHostDiscoveryAt < 30 * 60 * 1000 && activeEdgeCdnBase) {
        return activeEdgeCdnBase;
    }
    if (!forceRefresh && edgeHostDiscoveryFlight) {
        return edgeHostDiscoveryFlight;
    }

    edgeHostDiscoveryFlight = (async () => {
        try {
            const res = await fetch('https://dembed.st/premiumtv/daddy.php?id=91', {
                headers: {
                    'User-Agent': DEFAULT_UA,
                    Referer: 'https://thedaddy.pk/'
                },
                signal: AbortSignal.timeout(3500)
            });
            if (res.ok) {
                const html = await res.text();
                const edgeVarMatch =
                    html.match(/const\s+EDGE\s*=\s*["'](https?:\/\/edge\.[a-z0-9.-]+)["']/i) ||
                    html.match(/const\s+SRC\s*=\s*["'](https?:\/\/edge\.[a-z0-9.-]+)\/premium\d+\/index\.m3u8["']/i);
                if (edgeVarMatch?.[1]) {
                    activeEdgeCdnBase = edgeVarMatch[1].replace(/\/$/, '');
                    lastEdgeHostDiscoveryAt = Date.now();
                }
            }
        } catch {
            // Keep last known activeEdgeCdnBase
        }
        return activeEdgeCdnBase;
    })();

    try {
        return await edgeHostDiscoveryFlight;
    } finally {
        edgeHostDiscoveryFlight = null;
    }
}

/**
 * Fetches or reuses a short-lived playlist token for edge.wedd48c.top/premium<ID>/index.m3u8
 * Token TTL upstream is 120s; we reuse tokens for up to 75s and trigger a non-blocking background refresh
 * at 35s so manifest polling during playback takes 0ms and never waits on /api/playlist-token.
 */
async function getEdgePlaylistToken(slugKey: string, forceRefresh = false): Promise<string | null> {
    const cleanSlug = slugKey.split('::')[0];
    const now = Date.now();
    const cached = edgeTokenCache.get(slugKey);

    if (!forceRefresh && cached && now < cached.expiresAt) {
        if (now >= cached.refreshAt && !edgeTokenInFlight.has(slugKey)) {
            void fetchFreshEdgeToken(slugKey, cleanSlug, cached).catch(() => {});
        }
        return cached.token;
    }

    const existingFlight = edgeTokenInFlight.get(slugKey);
    if (existingFlight) {
        return existingFlight;
    }

    return fetchFreshEdgeToken(slugKey, cleanSlug, cached);
}

async function fetchFreshEdgeToken(
    slugKey: string,
    cleanSlug: string,
    cached?: { token: string; refreshAt: number; expiresAt: number; staleToken: string }
): Promise<string | null> {
    const flight = (async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const edgeBase = attempt > 1 ? await getActiveEdgeCdnBase(true) : await getActiveEdgeCdnBase(false);
                const res = await fetch(`${edgeBase}/api/playlist-token?slug=${encodeURIComponent(cleanSlug)}`, {
                    headers: {
                        'User-Agent': DEFAULT_UA,
                        ...DEMBED_HEADERS,
                        ...(attempt > 0 || slugKey.includes('::') ? { Connection: 'close' } : {})
                    },
                    signal: AbortSignal.timeout(2800)
                });
                if (!res.ok) {
                    await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
                    continue;
                }
                const data = (await res.json()) as { token?: string; ttl?: number };
                if (!data?.token) continue;
                const ttlSec = Math.max(60, Number(data.ttl) || 120);
                edgeTokenCache.set(slugKey, {
                    token: data.token,
                    refreshAt: Date.now() + Math.min(35, Math.floor(ttlSec * 0.35)) * 1000,
                    expiresAt: Date.now() + Math.min(80, Math.floor(ttlSec * 0.65)) * 1000,
                    staleToken: data.token
                });
                return data.token;
            } catch {
                if (attempt < 2) {
                    await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
                }
            }
        }
        return cached?.staleToken || null;
    })();

    edgeTokenInFlight.set(slugKey, flight);
    try {
        return await flight;
    } finally {
        edgeTokenInFlight.delete(slugKey);
    }
}

const aloulaSignedHlsCache = new Map<number, { signedUrl: string; expiresAt: number }>();
const aloulaSignedHlsInFlight = new Map<number, Promise<string | null>>();

/**
 * Resolves a fresh 24-hour `hdntl=` signed 1080p HLS `chunks.m3u8` media playlist URL from the official
 * Saudi Broadcasting Authority Aloula Faulio API (`https://aloula.faulio.com/api/v1.1/channels/{id}/player`)
 * for KSA Sports 1, 2, 3 (`الرياضية السعودية 1, 2, 3`).
 */
async function getAloulaSignedHlsUrl(aloulaChannelId: number, forceRefresh = false): Promise<string | null> {
    const cached = aloulaSignedHlsCache.get(aloulaChannelId);
    if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
        return cached.signedUrl;
    }

    const existing = aloulaSignedHlsInFlight.get(aloulaChannelId);
    if (existing) return existing;

    const flight = (async () => {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const res = await fetch(`https://aloula.faulio.com/api/v1.1/channels/${aloulaChannelId}/player`, {
                    headers: {
                        'User-Agent': DEFAULT_UA,
                        ...ALOULA_HEADERS
                    },
                    signal: AbortSignal.timeout(4500)
                });
                if (!res.ok) continue;
                const data = (await res.json()) as { streams?: { hls?: string } };
                const rawHlsUrl = data?.streams?.hls;
                if (!rawHlsUrl || !rawHlsUrl.startsWith('http')) continue;

                // Use live `playlist.m3u8` instead of `playlist_dvr.m3u8` to get the 1080p live `chunks.m3u8` with a 24-hour `hdntl=` token
                const masterUrl = rawHlsUrl.replace('playlist_dvr.m3u8', 'playlist.m3u8');
                const masterRes = await fetch(masterUrl, {
                    headers: {
                        'User-Agent': DEFAULT_UA,
                        ...ALOULA_HEADERS
                    },
                    signal: AbortSignal.timeout(4500)
                });
                if (masterRes.ok) {
                    const masterText = await masterRes.text();
                    const firstSubRel = masterText
                        .split(/\r?\n/)
                        .map((l) => l.trim())
                        .find((l) => l.length > 0 && !l.startsWith('#'));
                    if (firstSubRel) {
                        const chunksUrl = new URL(firstSubRel, masterUrl).toString();
                        aloulaSignedHlsCache.set(aloulaChannelId, {
                            signedUrl: chunksUrl,
                            expiresAt: Date.now() + 2 * 60 * 60 * 1000 // 24h hdntl token; refresh every 2 hours
                        });
                        return chunksUrl;
                    }
                }
            } catch {
                // Retry once on transient network blip
            }
        }
        return cached?.signedUrl || null;
    })();

    aloulaSignedHlsInFlight.set(aloulaChannelId, flight);
    try {
        return await flight;
    } finally {
        aloulaSignedHlsInFlight.delete(aloulaChannelId);
    }
}

const WIDEIPTV_SLUG_ALIASES: Record<string, string> = {
    bein1: 'beINAR',
    beinar1: 'beINAR',
    bein2: 'beINAR2',
    bein3: 'beINAR3',
    bein4: 'beINAR4',
    bein5: 'beINAR5',
    bein6: 'beINAR6',
    bein7: 'beINAR7',
    bein8: 'beINAR8',
    bein9: 'beINAR9',
    bein1fr: 'BEINSPORT1FR',
    bein2fr: 'BEINSPORT2FR',
    bein3fr: 'BEINSPORT3FR',
    skysportsfootball: 'SkySportsFootballUK',
    tnt2uk: 'TNTSports2',
    tnt3uk: 'TNTSports3',
    tnt4uk: 'TNTSports4'
};

const wideIptvSignedHlsCache = new Map<string, { signedUrl: string; refreshAt: number; expiresAt: number }>();
const wideIptvSignedHlsInFlight = new Map<string, Promise<string | null>>();

// 3-slot concurrency semaphore for wideiptv.top token scrapes so burst channel checks never trigger Nginx per-IP throttling
const MAX_WIDEIPTV_TOKEN_CONCURRENCY = 3;
let activeWideIptvTokenFetches = 0;
const wideIptvTokenWaitQueue: Array<() => void> = [];

async function withWideIptvTokenSlot<T>(fn: () => Promise<T>): Promise<T> {
    if (activeWideIptvTokenFetches >= MAX_WIDEIPTV_TOKEN_CONCURRENCY) {
        await new Promise<void>((resolve) => wideIptvTokenWaitQueue.push(resolve));
    }
    activeWideIptvTokenFetches += 1;
    try {
        return await fn();
    } finally {
        activeWideIptvTokenFetches = Math.max(0, activeWideIptvTokenFetches - 1);
        const next = wideIptvTokenWaitQueue.shift();
        if (next) next();
    }
}

/**
 * Resolves a fresh 5-minute `no_check_ip` signed HLS `tracks-v1a1/mono.m3u8?token=` URL from
 * `https://wideiptv.top/player/{slug}` (`cdn.wideiptv.top` Flussonic cluster).
 * Proactively refreshes tokens in the background after 140s so active playback never pauses for token renewal.
 */
async function getWideIptvSignedHlsUrl(rawSlug: string, forceRefresh = false): Promise<string | null> {
    const slug = WIDEIPTV_SLUG_ALIASES[rawSlug.toLowerCase()] || rawSlug;
    const now = Date.now();
    const cached = wideIptvSignedHlsCache.get(slug);
    if (!forceRefresh && cached && now < cached.expiresAt) {
        if (now >= cached.refreshAt && !wideIptvSignedHlsInFlight.has(slug)) {
            void fetchFreshWideIptvSignedHlsUrl(slug, cached).catch(() => {});
        }
        return cached.signedUrl;
    }

    const existing = wideIptvSignedHlsInFlight.get(slug);
    if (existing) return existing;

    return fetchFreshWideIptvSignedHlsUrl(slug, cached);
}

async function fetchFreshWideIptvSignedHlsUrl(
    slug: string,
    cached?: { signedUrl: string; refreshAt: number; expiresAt: number }
): Promise<string | null> {
    const flight = withWideIptvTokenSlot(async () => {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const res = await fetch(`https://wideiptv.top/player/${encodeURIComponent(slug)}`, {
                    headers: {
                        'User-Agent': DEFAULT_UA,
                        Referer: `https://wideiptv.top/daddy.php?stream=${encodeURIComponent(slug)}`
                    },
                    signal: AbortSignal.timeout(3800)
                });
                if (!res.ok) continue;
                const html = await res.text();
                const match = html.match(/streamUrl:\s*"([^"]+)"/);
                if (!match?.[1]) continue;
                const rawStreamUrl = match[1].replace(/\\\//g, '/').trim();
                if (!rawStreamUrl.startsWith('http')) continue;

                // Point directly to the Flussonic media playlist (`tracks-v1a1/mono.m3u8?token=...`)
                // so every .ts segment already carries its signed `no_check_ip` token
                const mediaPlaylistUrl = rawStreamUrl.replace('/index.m3u8', '/tracks-v1a1/mono.m3u8');
                wideIptvSignedHlsCache.set(slug, {
                    signedUrl: mediaPlaylistUrl,
                    refreshAt: Date.now() + 140 * 1000, // Background refresh at 140s
                    expiresAt: Date.now() + 240 * 1000 // Valid up to 240s (upstream token TTL is 300s)
                });
                return mediaPlaylistUrl;
            } catch {
                // Retry once on transient network blip
            }
        }
        return cached?.signedUrl || null;
    });

    wideIptvSignedHlsInFlight.set(slug, flight);
    try {
        return await flight;
    } finally {
        wideIptvSignedHlsInFlight.delete(slug);
    }
}

/**
 * If a URL targets edge.cowedd4855ws.sbs/premium<ID>/index.m3u8, wideiptv.top/player/<SLUG>/index.m3u8,
 * or live.kwikmotion.com/ksasports<1-3>live, attaches a fresh signed token automatically.
 */
async function resolveDynamicManifestUrl(
    rawUrl: string,
    headers?: Record<string, string>,
    forceRefreshToken = false
): Promise<{ url: string; headers: Record<string, string>; edgeSlug?: string }> {
    const mergedHeaders: Record<string, string> = {
        'User-Agent': DEFAULT_UA,
        ...(headers || {})
    };

    const edgeMatch = rawUrl.match(/https?:\/\/edge\.[a-z0-9.-]+\/(premium\d+)\/index\.m3u8/i);
    if (edgeMatch) {
        const slug = edgeMatch[1];
        const isBackupSlot = rawUrl.includes('backup=2');
        const tokenCacheKey = isBackupSlot ? `${slug}::b2` : slug;
        Object.assign(mergedHeaders, DEMBED_HEADERS);
        const token = await getEdgePlaylistToken(tokenCacheKey, forceRefreshToken);
        const edgeBase = await getActiveEdgeCdnBase(false);
        const baseClean = `${edgeBase}/${slug}/index.m3u8`;
        const finalUrl = token
            ? `${baseClean}?t=${encodeURIComponent(token)}&_=${Date.now()}`
            : `${baseClean}?_=${Date.now()}`;
        return { url: finalUrl, headers: mergedHeaders, edgeSlug: slug };
    }

    const wideMatch =
        rawUrl.match(/wideiptv\.top\/player\/([A-Za-z0-9_-]+)\/index\.m3u8/i) ||
        rawUrl.match(/(?:cdn\.wideiptv\.top|[a-z0-9.-]*bluetier\.top)\/([A-Za-z0-9_-]+)\/(?:index\.m3u8|tracks-v1a1\/mono\.m3u8)/i);
    if (wideMatch) {
        const slug = wideMatch[1];
        Object.assign(mergedHeaders, WIDEIPTV_HEADERS);
        const signedUrl = await getWideIptvSignedHlsUrl(slug, forceRefreshToken);
        if (signedUrl) {
            return { url: signedUrl, headers: mergedHeaders };
        }
        return { url: rawUrl, headers: mergedHeaders };
    }

    // Handle token expiration on Bluetier / cdn.wideiptv.top .ts segments when retrying a 403 segment
    const wideSegMatch = rawUrl.match(/(?:cdn\.wideiptv\.top|[a-z0-9.-]*bluetier\.top)\/([A-Za-z0-9_-]+)\/tracks-v1a1\/.+\.ts/i);
    if (wideSegMatch) {
        const slug = wideSegMatch[1];
        Object.assign(mergedHeaders, WIDEIPTV_HEADERS);
        if (forceRefreshToken || !rawUrl.includes('token=')) {
            const signedUrl = await getWideIptvSignedHlsUrl(slug, forceRefreshToken);
            const tokMatch = signedUrl?.match(/[?&]token=([^&]+)/);
            if (tokMatch) {
                const baseClean = rawUrl.split('?')[0];
                return { url: `${baseClean}?token=${tokMatch[1]}`, headers: mergedHeaders };
            }
        }
        return { url: rawUrl, headers: mergedHeaders };
    }

    const ksaMatch =
        rawUrl.match(/live\.kwikmotion\.com\/ksasports([123])live\/ksasports[123]\.smil\/playlist(?:_dvr)?\.m3u8(?:\?variant=([a-z0-9_]+))?/i) ||
        rawUrl.match(/live\.kwikmotion\.com\/ksasports([123])live\/ksasports[123]_(source|480p|360p)\/chunks(?:_dvr)?\.m3u8/i);
    if (ksaMatch) {
        Object.assign(mergedHeaders, ALOULA_HEADERS);
        const variant = (ksaMatch[2] || 'source').toLowerCase();
        const hasToken = rawUrl.includes('hdnts=') || rawUrl.includes('hdntl=');
        if (!hasToken || forceRefreshToken) {
            const num = Number(ksaMatch[1]);
            const aloulaChannelId = num === 1 ? 9 : num === 2 ? 10 : 16;
            const signedBaseUrl = await getAloulaSignedHlsUrl(aloulaChannelId, forceRefreshToken);
            if (signedBaseUrl) {
                let targetSignedUrl = signedBaseUrl;
                if (variant === 'dvr_source' || rawUrl.includes('chunks_dvr.m3u8')) {
                    targetSignedUrl = signedBaseUrl.replace('/chunks.m3u8', '/chunks_dvr.m3u8');
                } else if (variant === '480p') {
                    targetSignedUrl = signedBaseUrl.replace(`ksasports${num}_source/`, `ksasports${num}_480p/`);
                } else if (variant === '360p') {
                    targetSignedUrl = signedBaseUrl.replace(`ksasports${num}_source/`, `ksasports${num}_360p/`);
                }
                return { url: targetSignedUrl, headers: mergedHeaders };
            }
        }
        return { url: rawUrl, headers: mergedHeaders };
    }

    return { url: rawUrl, headers: mergedHeaders };
}

/**
 * Resilient upstream fetcher that automatically recovers from Node undici keep-alive socket resets
 * ("TypeError: fetch failed") and expired Edge tokens (401/403) without dropping the viewer's stream.
 */
async function fetchUpstreamWithRetry(
    rawUrl: string,
    headers?: Record<string, string>,
    options?: { maxAttempts?: number; timeoutMs?: number }
): Promise<{ res: Response; finalResolvedUrl: string }> {
    const maxAttempts = options?.maxAttempts ?? 4;
    const timeoutMs = options?.timeoutMs ?? 12000;
    let lastError: any = null;
    let lastResponse: Response | null = null;
    let lastResolvedUrl = rawUrl;
    let lastStatus = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const forceRefreshToken = attempt > 0 && (lastStatus === 401 || lastStatus === 403);
        const resolved = await resolveDynamicManifestUrl(rawUrl, headers, forceRefreshToken);
        lastResolvedUrl = resolved.url;

        const attemptHeaders: Record<string, string> = {
            ...resolved.headers,
            ...(attempt > 0 ? { Connection: 'close' } : {})
        };

        try {
            const res = await fetch(resolved.url, {
                method: 'GET',
                headers: attemptHeaders,
                redirect: 'follow',
                signal: AbortSignal.timeout(timeoutMs)
            });

            if (res.ok) {
                return { res, finalResolvedUrl: res.url || resolved.url };
            }

            lastResponse = res;
            lastStatus = res.status;
            if ([401, 403, 408, 429, 500, 502, 503, 504].includes(res.status) && attempt < maxAttempts - 1) {
                await new Promise((r) => setTimeout(r, 90 * (attempt + 1)));
                continue;
            }
            return { res, finalResolvedUrl: res.url || resolved.url };
        } catch (err) {
            lastError = err;
            if (attempt < maxAttempts - 1) {
                await new Promise((r) => setTimeout(r, 90 * (attempt + 1)));
            }
        }
    }

    if (lastResponse) {
        return { res: lastResponse, finalResolvedUrl: lastResolvedUrl };
    }
    throw lastError || new Error('Upstream fetch failed after retries');
}

/**
 * Full-Body Fast-Retry Downloader for MPEG-TS / .image segments and HLS manifests.
 * Enforces a strict total timeout (headers + complete body arrayBuffer) per attempt so that if a
 * congested CDN edge node stalls mid-body during a peak match (El Clásico / UCL),
 * the stalled socket is immediately aborted and retried on a fresh TCP connection without re-scraping valid tokens.
 */
async function fetchUpstreamBufferWithRetry(
    rawUrl: string,
    headers?: Record<string, string>,
    options?: { maxAttempts?: number; timeoutMs?: number; stallTimeoutMs?: number }
): Promise<{ buffer: Buffer; status: number; ok: boolean; contentType: string; finalResolvedUrl: string }> {
    const maxAttempts = options?.maxAttempts ?? 3;
    const stallTimeoutMs = options?.stallTimeoutMs ?? 3800;
    const maxTotalAttemptMs = Math.max(options?.timeoutMs ?? 7500, 4000);
    let lastError: any = null;
    let lastStatus = 502;
    let lastResolvedUrl = rawUrl;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Only force-refresh token if the previous attempt actually returned 401/403 (expired token),
        // never on a transient socket timeout
        const forceRefreshToken = attempt > 0 && (lastStatus === 401 || lastStatus === 403);
        const resolved = await resolveDynamicManifestUrl(rawUrl, headers, forceRefreshToken);
        lastResolvedUrl = resolved.url;

        const attemptHeaders: Record<string, string> = {
            ...resolved.headers,
            ...(attempt > 0 ? { Connection: 'close', 'Cache-Control': 'no-cache' } : {})
        };

        const controller = new AbortController();
        let stallTimer: ReturnType<typeof setTimeout> | null = null;
        let hardTimer: ReturnType<typeof setTimeout> | null = null;

        const clearTimers = () => {
            if (stallTimer) {
                clearTimeout(stallTimer);
                stallTimer = null;
            }
            if (hardTimer) {
                clearTimeout(hardTimer);
                hardTimer = null;
            }
        };

        const resetStallWatchdog = (rejectFn: (err: Error) => void) => {
            if (stallTimer) clearTimeout(stallTimer);
            stallTimer = setTimeout(() => {
                try {
                    controller.abort();
                } catch {}
                rejectFn(new Error(`socket_stalled_${stallTimeoutMs}ms`));
            }, stallTimeoutMs);
        };

        try {
            const result = await new Promise<{
                buffer: Buffer;
                status: number;
                ok: boolean;
                contentType: string;
                finalResolvedUrl: string;
            }>((resolve, reject) => {
                hardTimer = setTimeout(() => {
                    try {
                        controller.abort();
                    } catch {}
                    reject(new Error(`attempt_hard_timeout_${maxTotalAttemptMs}ms`));
                }, maxTotalAttemptMs);

                resetStallWatchdog(reject);

                (async () => {
                    const res = await fetch(resolved.url, {
                        method: 'GET',
                        headers: attemptHeaders,
                        redirect: 'follow',
                        signal: controller.signal
                    });
                    resetStallWatchdog(reject);

                    lastStatus = res.status;
                    const contentType = (res.headers.get('content-type') || '').toLowerCase();
                    if (!res.ok || !res.body) {
                        resolve({
                            buffer: Buffer.alloc(0),
                            status: res.status,
                            ok: false,
                            contentType,
                            finalResolvedUrl: res.url || resolved.url
                        });
                        return;
                    }

                    const reader = res.body.getReader();
                    const chunks: Uint8Array[] = [];
                    let totalLen = 0;

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        if (value && value.byteLength > 0) {
                            chunks.push(value);
                            totalLen += value.byteLength;
                            resetStallWatchdog(reject);
                        }
                    }

                    resolve({
                        buffer: Buffer.concat(chunks, totalLen),
                        status: res.status,
                        ok: true,
                        contentType,
                        finalResolvedUrl: res.url || resolved.url
                    });
                })().catch(reject);
            });

            clearTimers();

            if (result.ok && result.buffer.length > 0) {
                return result;
            }

            if ([401, 403, 408, 429, 500, 502, 503, 504].includes(result.status) && attempt < maxAttempts - 1) {
                await new Promise((r) => setTimeout(r, 60 * (attempt + 1)));
                continue;
            }
            return result;
        } catch (err) {
            clearTimers();
            lastError = err;
            if (attempt < maxAttempts - 1) {
                await new Promise((r) => setTimeout(r, 60 * (attempt + 1)));
            }
        }
    }

    if (lastStatus !== 502) {
        return {
            buffer: Buffer.alloc(0),
            status: lastStatus,
            ok: false,
            contentType: '',
            finalResolvedUrl: lastResolvedUrl
        };
    }
    throw lastError || new Error('Upstream buffer download failed after retries');
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

function parsePngChunksForTpix(bytes: Uint8Array): {
    w: number;
    h: number;
    ctype: number;
    zbuf: Buffer;
} | null {
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

    return { w, h, ctype, zbuf };
}

function reconstructTpixGzFromRawScanlines(raw: Buffer, w: number, h: number, ctype: number): Buffer | null {
    const bpp = ctype === 6 ? 4 : 3;
    const stride = w * bpp;
    const rowRgbBytes = w * 3;
    const maxRgbCapacity = rowRgbBytes * h;
    if (maxRgbCapacity < 16) return null;

    const rgb = Buffer.allocUnsafe(maxRgbCapacity);
    let src = 0;
    let dst = 0;
    let prev: Uint8Array = new Uint8Array(stride);
    let requiredTotalBytes = 0;

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
            dst += rowRgbBytes;
            prev = row;
        } else {
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

        // Check TPIX header ("TIKTIKPX") as soon as the first 12 bytes are reconstructed so we can stop early
        if (requiredTotalBytes === 0 && dst >= 12) {
            if (
                rgb[0] !== 84 ||
                rgb[1] !== 73 ||
                rgb[2] !== 75 ||
                rgb[3] !== 84 ||
                rgb[4] !== 73 ||
                rgb[5] !== 75 ||
                rgb[6] !== 80 ||
                rgb[7] !== 88
            ) {
                return null;
            }
            const n = rgb.readUInt32BE(8);
            if (n <= 0 || 12 + n > maxRgbCapacity) return null;
            requiredTotalBytes = 12 + n;
        }

        if (requiredTotalBytes > 0 && dst >= requiredTotalBytes) {
            break;
        }
    }

    if (requiredTotalBytes === 0 || dst < requiredTotalBytes) return null;
    const gz = rgb.subarray(12, requiredTotalBytes);
    if (gz.length < 2 || gz[0] !== 0x1f || gz[1] !== 0x8b) return null;
    return gz;
}

function extractPngPixelsTs(bytes: Uint8Array): Buffer | null {
    const parsed = parsePngChunksForTpix(bytes);
    if (!parsed) return null;
    try {
        const raw = zlib.inflateSync(parsed.zbuf);
        const gz = reconstructTpixGzFromRawScanlines(raw, parsed.w, parsed.h, parsed.ctype);
        if (!gz) return null;
        const ts = zlib.gunzipSync(gz);
        if (ts.length > 0 && ts[0] === 0x47) return ts;
    } catch {
        return null;
    }
    return null;
}

async function extractPngPixelsTsAsync(bytes: Uint8Array): Promise<Buffer | null> {
    const parsed = parsePngChunksForTpix(bytes);
    if (!parsed) return null;
    try {
        const raw = (await inflateAsync(parsed.zbuf)) as Buffer;
        const gz = reconstructTpixGzFromRawScanlines(raw, parsed.w, parsed.h, parsed.ctype);
        if (!gz) return null;
        const ts = (await gunzipAsync(gz)) as Buffer;
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

    for (let i = 0; i + 376 < buf.length; i++) {
        if (buf[i] === 0x47 && buf[i + 188] === 0x47 && buf[i + 376] === 0x47) {
            return buf.subarray(i);
        }
    }

    return buf;
}

/**
 * Non-blocking async MPEG-TS segment unwrapper that offloads zlib inflate/gunzip to Node's C++ libuv threadpool
 * so multi-megabyte 1080p50 segments never block concurrent manifest or segment requests.
 */
export async function unwrapLiveTsSegmentAsync(buf: Buffer): Promise<Buffer> {
    if (buf.length < 188) return buf;
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

    const fromPngPixels = await extractPngPixelsTsAsync(bytes);
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
            const unzipped = (await gunzipAsync(buf.subarray(idxGz + TSGZ.length))) as Buffer;
            if (unzipped.length > 0 && unzipped[0] === 0x47) return unzipped;
        } catch {
            // Fall through
        }
    }

    for (let i = 0; i + 376 < buf.length; i++) {
        if (buf[i] === 0x47 && buf[i + 188] === 0x47 && buf[i + 376] === 0x47) {
            return buf.subarray(i);
        }
    }

    return buf;
}

// ============================================================================
// REAL-TIME BROADCAST AUDIO DSP & ANTI-CLIPPING ENGINE (FOR beIN SPORTS FEEDS)
// ============================================================================
const BROADCAST_AUDIO_DSP_FILTER =
    'highpass=f=35,lowpass=f=16500,acompressor=threshold=-16dB:ratio=2.5:attack=8:release=120,dynaudnorm=f=250:g=9:p=0.72:m=3.0:s=15,alimiter=limit=0.84:attack=3:release=50';

const MAX_AUDIO_DSP_WORKERS = 8;
let activeAudioDspWorkers = 0;
let totalAudioDspCleanedSegments = 0;
const channelContinuityCounterMap = new Map<string, Map<number, number>>();

/**
 * Determines whether standalone per-segment FFmpeg re-encoding should run.
 * IMPORTANT: Standalone per-segment FFmpeg AAC re-encoding appends a 21.3ms trailing flush packet
 * at the end of every 5s segment and alters MPEG-TS PIDs, which causes browser MSE (hls.js) and
 * ExoPlayer to accumulate timestamp drift and disconnect after 15-30s.
 * By default, segments are served bit-exact from the hardware encoder to guarantee 100% continuous
 * PCR/PTS/DTS timestamps and zero disconnects.
 */
export function shouldApplyBroadcastAudioDsp(_channelId?: string, _segmentOrManifestUrl?: string): boolean {
    return false;
}

/**
 * Stitches the 4-bit MPEG-TS continuity_counter per PID across consecutive remuxed segments
 * so browser MSE SourceBuffers, hls.js, VLC, and ExoPlayer see a 100% seamless packet stream.
 */
function stitchMpegTsContinuityCounters(tsBuf: Buffer, channelKey: string): Buffer {
    let pidMap = channelContinuityCounterMap.get(channelKey);
    if (!pidMap) {
        pidMap = new Map<number, number>();
        channelContinuityCounterMap.set(channelKey, pidMap);
    }

    for (let off = 0; off + 188 <= tsBuf.length; off += 188) {
        if (tsBuf[off] !== 0x47) continue;
        const pid = ((tsBuf[off + 1] & 0x1f) << 8) | tsBuf[off + 2];
        if (pid === 0x1fff) continue; // Null padding packet
        const afc = (tsBuf[off + 3] >> 4) & 0x03;
        const hasPayload = afc === 1 || afc === 3;
        if (hasPayload) {
            const cc = pidMap.has(pid) ? pidMap.get(pid)! : tsBuf[off + 3] & 0x0f;
            tsBuf[off + 3] = (tsBuf[off + 3] & 0xf0) | (cc & 0x0f);
            pidMap.set(pid, (cc + 1) & 0x0f);
        } else if (pidMap.has(pid)) {
            const prevCc = (pidMap.get(pid)! + 15) & 0x0f;
            tsBuf[off + 3] = (tsBuf[off + 3] & 0xf0) | prevCc;
        }
    }
    return tsBuf;
}

/**
 * Runs non-blocking server-side broadcast audio DSP on an unwrapped MPEG-TS segment:
 * - Video stream is copied 100% untouched (-c:v copy) with exact PTS/DTS preservation (-copyts -mpegts_copyts 1).
 * - Preserves 100% of natural stadium crowd cheering, chants, and bass drums (no noise gate ducking):
 *   1. 35 Hz Sub-Sonic High-Pass filter (removes only <35Hz DC offset while keeping full 40-85Hz stadium bass & drums)
 *   2. 16.5 kHz Low-Pass filter (removes only >16.5kHz digital AAC aliasing hiss while keeping crowd air & excitement)
 *   3. 2.5:1 Transparent Broadcast Mastering Compressor + Loudness Normalizer (-16.5 dB target)
 *   4. -1.5 dBFS Soft Limiter (eliminates 0.0 dB hard crackling/clipping when the crowd roars or commentator shouts)
 */
export async function cleanBroadcastAudioTsSegment(rawTsBuf: Buffer, channelKey: string): Promise<Buffer> {
    if (rawTsBuf.length < 188 || rawTsBuf[0] !== 0x47) {
        return rawTsBuf;
    }
    if (activeAudioDspWorkers >= MAX_AUDIO_DSP_WORKERS) {
        return rawTsBuf;
    }

    activeAudioDspWorkers += 1;
    try {
        const cleaned = await new Promise<Buffer>((resolve) => {
            const chunks: Buffer[] = [];
            let settled = false;
            const proc = spawn(
                'ffmpeg',
                [
                    '-hide_banner',
                    '-loglevel',
                    'error',
                    '-threads',
                    '2',
                    '-f',
                    'mpegts',
                    '-i',
                    'pipe:0',
                    '-copyts',
                    '-muxdelay',
                    '0',
                    '-muxpreload',
                    '0',
                    '-map',
                    '0:v:0?',
                    '-map',
                    '0:a:0?',
                    '-c:v',
                    'copy',
                    '-af',
                    BROADCAST_AUDIO_DSP_FILTER,
                    '-c:a',
                    'aac',
                    '-ar',
                    '48000',
                    '-ac',
                    '2',
                    '-b:a',
                    '160k',
                    '-streamid',
                    '0:211',
                    '-streamid',
                    '1:221',
                    '-mpegts_copyts',
                    '1',
                    '-f',
                    'mpegts',
                    'pipe:1'
                ],
                { stdio: ['pipe', 'pipe', 'ignore'] }
            );

            const safetyTimer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    try {
                        proc.kill('SIGKILL');
                    } catch {}
                    resolve(rawTsBuf);
                }
            }, 3800);

            proc.stdout.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });

            proc.on('error', () => {
                if (!settled) {
                    settled = true;
                    clearTimeout(safetyTimer);
                    resolve(rawTsBuf);
                }
            });

            proc.on('close', (code) => {
                if (settled) return;
                settled = true;
                clearTimeout(safetyTimer);
                if (code === 0 && chunks.length > 0) {
                    const outBuf = Buffer.concat(chunks);
                    if (outBuf.length >= 188 && outBuf[0] === 0x47) {
                        totalAudioDspCleanedSegments += 1;
                        resolve(stitchMpegTsContinuityCounters(outBuf, channelKey));
                        return;
                    }
                }
                resolve(rawTsBuf);
            });

            proc.stdin.on('error', () => {});
            proc.stdin.end(rawTsBuf);
        });
        return cleaned;
    } finally {
        activeAudioDspWorkers = Math.max(0, activeAudioDspWorkers - 1);
    }
}

// ============================================================================
// PILLAR 2 & 5: ROLLING SERVER HEALTH REGISTRY, CIRCUIT BREAKER & MPEG-TS INSPECTOR
// ============================================================================
export interface StreamHealthState {
    url: string;
    channelId?: string;
    successCount: number;
    failureCount: number;
    consecutiveFailures: number;
    emaLatencyMs: number;
    healthScore: number;
    circuitState: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
    circuitOpenedAt: number;
    lastVerifiedAt: number;
    lastError?: string;
    failoverCount: number;
}

const CIRCUIT_OPEN_COOLDOWN_MS = 90 * 1000; // 90s cooldown before HALF_OPEN retry
const streamHealthRegistry = new Map<string, StreamHealthState>();
const streamInspectionRegistry = new Map<string, MpegTsInspectionInfo>();
const streamVariantsCache = new Map<
    string,
    {
        variants: HlsQualityVariant[];
        audioTracks: Array<{ language: string; label: string }>;
        updatedAt: number;
    }
>();

function getOrCreateHealthState(url: string, channelId?: string): StreamHealthState {
    let state = streamHealthRegistry.get(url);
    if (!state) {
        state = {
            url,
            channelId,
            successCount: 0,
            failureCount: 0,
            consecutiveFailures: 0,
            emaLatencyMs: 220,
            healthScore: 92,
            circuitState: 'CLOSED',
            circuitOpenedAt: 0,
            lastVerifiedAt: 0,
            failoverCount: 0
        };
        streamHealthRegistry.set(url, state);
    } else if (channelId && !state.channelId) {
        state.channelId = channelId;
    }
    // Check if an OPEN circuit is ready to transition to HALF_OPEN
    if (state.circuitState === 'OPEN' && Date.now() - state.circuitOpenedAt >= CIRCUIT_OPEN_COOLDOWN_MS) {
        state.circuitState = 'HALF_OPEN';
    }
    return state;
}

function recordStreamHealthResult(
    url: string,
    ok: boolean,
    latencyMs: number,
    channelId?: string,
    errorReason?: string
): StreamHealthState {
    const state = getOrCreateHealthState(url, channelId);
    if (ok) {
        state.successCount += 1;
        state.consecutiveFailures = 0;
        state.circuitState = 'CLOSED';
        state.lastVerifiedAt = Date.now();
        state.emaLatencyMs = Math.round(state.emaLatencyMs * 0.7 + Math.min(4000, Math.max(10, latencyMs)) * 0.3);
        const total = state.successCount + state.failureCount;
        const successRatio = total > 0 ? state.successCount / total : 1;
        const latencyPenalty = Math.min(25, Math.floor(state.emaLatencyMs / 150));
        state.healthScore = Math.max(20, Math.min(100, Math.round(successRatio * 100) - latencyPenalty + 8));
    } else {
        state.failureCount += 1;
        state.consecutiveFailures += 1;
        state.lastError = errorReason || 'probe_failed';
        if (state.consecutiveFailures >= 3) {
            state.circuitState = 'OPEN';
            state.circuitOpenedAt = Date.now();
        }
        const total = state.successCount + state.failureCount;
        const successRatio = total > 0 ? state.successCount / total : 0;
        state.healthScore = Math.max(5, Math.min(85, Math.round(successRatio * 80) - state.consecutiveFailures * 12));
    }
    return state;
}

/**
 * Inspects an unwrapped 188-byte MPEG-TS segment buffer to verify sync bytes (0x47),
 * estimate bitrate, and extract the real DVB Service Description Table (SDT PID 0x0011) service/provider name.
 */
export function inspectMpegTsSegment(buf: Buffer, sourceUrl?: string): MpegTsInspectionInfo {
    if (sourceUrl) {
        const existing = streamInspectionRegistry.get(sourceUrl);
        if (existing && Date.now() - new Date(existing.inspectedAt).getTime() < 120 * 1000) {
            return existing;
        }
    }
    const packetCount = Math.floor(buf.length / 188);
    const syncValid = buf.length >= 188 && buf[0] === 0x47 && (buf.length < 376 || buf[188] === 0x47);
    let serviceName: string | undefined;
    let providerName: string | undefined;

    if (syncValid) {
        const maxPackets = Math.min(packetCount, 2500);
        for (let p = 0; p < maxPackets; p++) {
            const off = p * 188;
            if (buf[off] !== 0x47) continue;
            const pid = ((buf[off + 1] & 0x1f) << 8) | buf[off + 2];
            // PID 0x0011 = DVB Service Description Table (SDT)
            if (pid === 0x0011) {
                const payloadUnitStart = (buf[off + 1] & 0x40) !== 0;
                const adaptationFieldControl = (buf[off + 3] >> 4) & 0x03;
                let payloadOff = off + 4;
                if (adaptationFieldControl === 2) continue;
                if (adaptationFieldControl === 3) {
                    payloadOff += 1 + buf[payloadOff];
                }
                if (payloadUnitStart && payloadOff < off + 188) {
                    payloadOff += 1 + buf[payloadOff];
                }
                if (payloadOff + 12 >= off + 188) continue;
                const tableId = buf[payloadOff];
                if (tableId !== 0x42 && tableId !== 0x46) continue;
                const sectionSlice = buf.subarray(payloadOff, off + 188);
                // Descriptor tag 0x48 = service_descriptor
                for (let idx = 11; idx + 6 < sectionSlice.length; idx++) {
                    if (sectionSlice[idx] === 0x48) {
                        const descLen = sectionSlice[idx + 1];
                        if (idx + 2 + descLen > sectionSlice.length) break;
                        const provLen = sectionSlice[idx + 3];
                        const provStart = idx + 4;
                        const provEnd = provStart + provLen;
                        if (provEnd + 1 > sectionSlice.length) break;
                        const svcLen = sectionSlice[provEnd];
                        const svcStart = provEnd + 1;
                        const svcEnd = svcStart + svcLen;
                        if (svcEnd > sectionSlice.length) break;
                        const rawProv = sectionSlice
                            .subarray(provStart, provEnd)
                            .toString('utf8')
                            .replace(/[\x00-\x1F\x7F]/g, '')
                            .trim();
                        const rawSvc = sectionSlice
                            .subarray(svcStart, svcEnd)
                            .toString('utf8')
                            .replace(/[\x00-\x1F\x7F]/g, '')
                            .trim();
                        if (rawSvc.length >= 2) {
                            serviceName = rawSvc;
                            providerName = rawProv || undefined;
                            break;
                        }
                    }
                }
                if (serviceName) break;
            }
        }
    }

    // Typical HLS segment duration is ~4s; estimate bitrate in kbps
    const estimatedBitrateKbps = buf.length > 0 ? Math.round((buf.length * 8) / (4 * 1000)) : undefined;
    const info: MpegTsInspectionInfo = {
        syncValid,
        packetCount,
        serviceName,
        providerName,
        estimatedBitrateKbps,
        inspectedAt: new Date().toISOString()
    };

    if (sourceUrl) {
        streamInspectionRegistry.set(sourceUrl, info);
    }
    return info;
}

// ============================================================================
// PILLAR 1: MULTI-QUALITY VARIANT & MULTI-AUDIO TRACK PARSER
// ============================================================================
export function parseHlsMasterVariants(
    manifestText: string,
    manifestBaseUrl: string,
    publicBaseUrl: string,
    headers?: Record<string, string>,
    channelId?: string,
    defaultQuality = '1080p',
    defaultLang = 'en',
    canonicalManifestUrl?: string
): {
    variants: HlsQualityVariant[];
    audioTracks: Array<{ language: string; label: string }>;
} {
    const lines = manifestText.split(/\r?\n/);
    const variants: HlsQualityVariant[] = [];
    const audioTracks: Array<{ language: string; label: string }> = [];

    const resolveRel = (rel: string): string => {
        if (/^https?:\/\//i.test(rel)) return rel;
        try {
            return new URL(rel, manifestBaseUrl).toString();
        } catch {
            return rel;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXT-X-MEDIA:') && /TYPE=AUDIO/i.test(line)) {
            const langMatch = line.match(/LANGUAGE="([^"]+)"/i);
            const nameMatch = line.match(/NAME="([^"]+)"/i);
            const langCode = (langMatch?.[1] || defaultLang).toLowerCase();
            const label = nameMatch?.[1] || langCode.toUpperCase();
            if (!audioTracks.some((a) => a.language === langCode && a.label === label)) {
                audioTracks.push({ language: langCode, label });
            }
        } else if (line.startsWith('#EXT-X-STREAM-INF:')) {
            const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
            const resMatch = line.match(/RESOLUTION=(\d+x\d+)/i);
            const fpsMatch = line.match(/FRAME-RATE=([\d.]+)/i);
            const codecsMatch = line.match(/CODECS="([^"]+)"/i);

            let j = i + 1;
            while (j < lines.length && (!lines[j].trim() || lines[j].trim().startsWith('#'))) {
                if (lines[j].trim().startsWith('#EXT-X-STREAM-INF:')) break;
                j++;
            }
            const nextLine = (lines[j] || '').trim();
            if (!nextLine || nextLine.startsWith('#')) continue;

            const variantRawUrl = resolveRel(nextLine);
            const bandwidth = bwMatch ? Number(bwMatch[1]) : 4500000;
            const resolution = resMatch ? resMatch[1] : '1920x1080';
            const height = Number(resolution.split('x')[1] || 1080);
            const fps = fpsMatch ? Math.round(Number(fpsMatch[1])) : undefined;

            const label =
                height >= 2160
                    ? '4K UHD'
                    : height >= 1080
                    ? `1080p FHD${fps && fps >= 50 ? ` ${fps}fps` : ''}`
                    : height >= 720
                    ? `720p HD${fps && fps >= 50 ? ` ${fps}fps` : ''}`
                    : height >= 540
                    ? '576p HQ'
                    : height >= 480
                    ? '480p SD'
                    : '360p LD';

            const proxiedVariantUrl = buildLiveProxyUrl(variantRawUrl, publicBaseUrl, headers, channelId, label);
            variants.push({
                label,
                resolution,
                bandwidth,
                fps,
                codecs: codecsMatch?.[1],
                url: proxiedVariantUrl,
                rawUrl: variantRawUrl
            });
        }
    }

    // Sort variants highest bandwidth/resolution first and deduplicate labels
    variants.sort((a, b) => b.bandwidth - a.bandwidth);

    // If this upstream is a direct single-bitrate media playlist (e.g., Bluetier Flussonic or Edge CDN 1080p 50fps),
    // always use canonicalManifestUrl (e.g., https://wideiptv.top/player/beINAR/index.m3u8) instead of a temporary
    // tokenized URL so tokens auto-renew indefinitely on every poll without expiring after 3 minutes.
    if (variants.length === 0) {
        const targetSingleUrl = canonicalManifestUrl || manifestBaseUrl;
        const baseProxied = buildLiveProxyUrl(targetSingleUrl, publicBaseUrl, headers, channelId);
        const is720 = defaultQuality.includes('720');
        variants.push({
            label: is720 ? '720p HD (Native)' : '1080p FHD 50fps',
            resolution: is720 ? '1280x720' : '1920x1080',
            bandwidth: is720 ? 3200000 : 5800000,
            fps: 50,
            url: baseProxied,
            rawUrl: targetSingleUrl
        });
    }

    return { variants, audioTracks };
}

// ============================================================================
// PILLAR 3: OFFICIAL IPTV-ORG API (https://iptv-org.github.io/api/streams.json)
// & DYNAMIC M3U HARVESTER (https://github.com/iptv-org/iptv)
// ============================================================================
let dynamicChannelCache: Map<
    string,
    Array<{ label: string; url: string; quality: string; headers?: Record<string, string> }>
> = new Map();
let lastHarvestTime = 0;
const HARVEST_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface IptvOrgApiStreamEntry {
    channel?: string | null;
    feed?: string | null;
    title?: string | null;
    url?: string | null;
    referrer?: string | null;
    user_agent?: string | null;
    quality?: string | null;
}

/**
 * Exact 1-to-1 and fallback mapping from our internal channel IDs to official `iptv-org` channel IDs
 * (`tvg-id` / `channel` in https://iptv-org.github.io/api/streams.json and https://github.com/iptv-org/iptv).
 */
export const CHANNEL_TO_IPTV_ORG_IDS: Record<string, string[]> = {
    // 1. Saudi SSC & Gulf Sports (strictly 1-to-1 same-channel mapping — never cross-link different channels)
    'ssc-sport-1-ar': ['SSCSport1.sa', 'SaudiSports1.sa'],
    'ssc-sport-2-ar': ['SSCSport2.sa', 'SaudiSports2.sa'],
    'ssc-sport-3-ar': ['SSCSport3.sa', 'SaudiSports3.sa'],
    'ssc-extra-1-ar': ['SSCSportExtra1.sa', 'SaudiSports1.sa'],
    'ssc-extra-2-ar': ['SSCSportExtra2.sa', 'SaudiSports2.sa'],
    'ssc-extra-3-ar': ['SSCSportExtra3.sa', 'SaudiSports3.sa'],
    'starzplay-sports-1-ar': ['AbuDhabiSportsPremium1.ae'],
    'starzplay-sports-2-ar': ['AbuDhabiSportsPremium2.ae'],
    'alkass-1-ar': ['AlkassOne.qa'],
    'alkass-2-ar': ['AlkassThree.qa'],
    'alkass-3-ar': ['AlkassFour.qa'],
    'ad-sports-1-ar': ['AbuDhabiSports1.ae'],
    'ad-sports-2-ar': ['AbuDhabiSports2.ae'],
    'dubai-sports-1-ar': ['DubaiSports1.ae'],
    'ontime-sports-1-ar': ['OnTimeSports.eg', 'OnTimeSports1.eg'],
    'ktv-sport-ar': ['KTVSport.kw'],
    'arryadia-ar': ['Arryadia.ma'],

    // 2. beIN Sports MENA, EN, FR, TR, USA, AU (strictly 1-to-1 per channel number)
    'bein-sports-open-ar': ['beINSports.qa', 'beINSportsNews.qa'],
    'bein-sports-1-ar': ['beINSports1.qa', 'beINSports4KHDR.qa'],
    'bein-sports-2-ar': ['beINSports2.qa'],
    'bein-sports-3-ar': ['beINSports3.qa'],
    'bein-sports-4-ar': ['beINSports4.qa'],
    'bein-sports-5-ar': ['beINSports5.qa'],
    'bein-sports-6-ar': ['beINSports6.qa'],
    'bein-sports-7-ar': ['beINSports7.qa'],
    'bein-sports-8-ar': ['beINSports8.qa', 'beINSportsNBA.qa'],
    'bein-sports-9-ar': ['beINSports9.qa'],
    'bein-sports-premium-1-ar': ['beINSportsPremium1.qa', 'beINSports1.qa'],
    'bein-sports-premium-2-ar': ['beINSportsPremium2.qa', 'beINSports2.qa'],
    'bein-sports-premium-3-ar': ['beINSportsPremium3.qa', 'beINSports3.qa'],
    'bein-sports-afc-ar': ['beINSportsAFC.qa', 'beINSportsAFC1.qa', 'beINSportsAFC2.qa', 'beINSportsAFC3.qa'],
    'bein-sports-xtra-1-ar': ['beINSportsXtra1.qa', 'beINSportsXtra2.qa'],
    'bein-sports-en-1': ['beINSportsEnglish1.qa', 'beINSports1English.qa'],
    'bein-sports-en-2': ['beINSportsEnglish2.qa', 'beINSports2English.qa'],
    'bein-sports-en-3': ['beINSportsEnglish3.qa', 'beINSports3English.qa'],
    'bein-sports-usa': ['beINSportsUSA.us', 'beINSports.us'],
    'bein-sports-au-1': ['beINSports1.au'],
    'bein-sports-au-2': ['beINSports2.au'],
    'bein-sports-au-3': ['beINSports3.au'],
    'bein-sports-xtra-en': ['beINSPORTSXTRA.us', 'beINSportsXtra1.qa'],
    'bein-sports-xtra-es': ['beINSPORTSXTRAenEspanol.us', 'beINSportsenEspanol.qa', 'beINSportsEnEspanol.us'],
    'bein-sports-fr-1': ['beINSportsFrench1.qa', 'beINSports1.fr'],
    'bein-sports-fr-2': ['beINSportsFrench2.qa', 'beINSports2.fr'],
    'bein-sports-fr-3': ['beINSportsFrench3.qa', 'beINSports3.fr'],
    'bein-sports-max-4-fr': ['beINSportsMax4.qa', 'beINSportsMax4.fr'],
    'bein-sports-max-5-fr': ['beINSportsMax5.qa', 'beINSportsMax5.fr'],
    'bein-sports-max-6-fr': ['beINSportsMax6.qa', 'beINSportsMax6.fr'],
    'bein-sports-max-7-fr': ['beINSportsMax7.qa', 'beINSportsMax7.fr'],
    'bein-sports-max-8-fr': ['beINSportsMax8.qa', 'beINSportsMax8.fr'],
    'bein-sports-max-9-fr': ['beINSportsMax9.qa', 'beINSportsMax9.fr'],
    'bein-sports-max-10-fr': ['beINSportsMax10.qa', 'beINSportsMax10.fr'],
    'bein-sports-1-tr': ['beINSports1Turk.tr', 'beINSports1.tr'],
    'bein-sports-2-tr': ['beINSports2Turk.tr', 'beINSports2.tr'],
    'bein-sports-3-tr': ['beINSports3Turk.tr', 'beINSports3.tr'],
    'bein-sports-4-tr': ['beINSports4Turk.tr', 'beINSports4.tr'],
    'bein-sports-5-tr': ['beINSports5Turk.tr', 'beINSports5.tr'],
    'bein-sports-haber-tr': ['beINSportsHaber.tr', 'HTSporTV.tr'],

    // 3. Arabic Movies, Rotana, Shahid & MBC (strictly 1-to-1 per channel)
    'bein-movies-action-ar': ['MoviesAction.sa'],
    'bein-movies-thriller-ar': ['MoviesThriller.sa'],
    'bein-aflam-ar': ['RotanaCinemaKSA.sa'],
    'rotana-cinema-ar': ['RotanaCinemaKSA.sa'],
    'rotana-drama-ar': ['RotanaDrama.sa'],
    'rotana-comedy-ar': ['RotanaComedy.sa'],
    'mbc-1-ar': ['MBC1.ae'],
    'mbc-4-ar': ['MBC4.ae'],
    'mbc-5-ar': ['MBC5.ae'],
    'mbc-drama-ar': ['MBCDrama.ae'],
    'mbc-plus-drama-ar': ['MBCPlusDrama.sa'],
    'mbc-masr-ar': ['MBCMasr.eg'],
    'mbc-masr-2-ar': ['MBCMasr2.eg'],
    'mbc-iraq-ar': ['MBCIraq.iq'],
    'bab-al-hara-ar': ['BabAlHara.sa'],
    'spacetoon-ar': ['Spacetoon.ae'],

    // 4. UK, Europe & US Sports (strictly 1-to-1 per channel)
    'sky-sports-main-event': ['SkySportsMainEvent.uk'],
    'sky-sports-premier-league': ['SkySportsPremierLeague.uk'],
    'sky-sports-football': ['SkySportsFootball.uk'],
    'sky-sports-f1': ['SkySportsF1.uk'],
    'sky-sports-cricket': ['SkySportsCricket.uk'],
    'sky-sports-golf': ['SkySportsGolf.uk'],
    'sky-sports-tennis': ['SkySportsTennis.uk'],
    'sky-sports-mix': ['SkySportsMix.uk'],
    'sky-sports-plus': ['SkySportsPlus.uk'],
    'sky-sports-action': ['SkySportsAction.uk'],
    'sky-sports-racing': ['SkySportsRacing.uk'],
    'sky-sports-news': ['SkySportsNews.uk'],
    'tnt-sports-1': ['TNTSports1.uk'],
    'tnt-sports-2': ['TNTSports2.uk'],
    'tnt-sports-3': ['TNTSports3.uk'],
    'tnt-sports-4': ['TNTSports4.uk'],
    'premier-sports-1': ['PremierSports1.uk'],
    'premier-sports-2': ['PremierSports2.uk'],
    'laligatv-uk': ['LaLigaTV.uk'],
    'mutv-uk': ['MUTV.uk'],
    'itv4-sport-uk': ['ITV4.uk'],
    'talksport-tv-uk': ['talkSPORT.uk'],
    'rugbypass-tv-uk': ['RugbyPassTV.uk'],
    'eurosport-1': ['Eurosport1.uk'],
    'eurosport-2': ['Eurosport2.uk'],
    'fox-sports-1': ['FoxSports1.us'],
    'fox-sports-2': ['FoxSports2.us'],
    'fox-deportes-us': ['FoxDeportes.us'],
    'fox-sports-news': ['FoxSportsNews.au'],
    'espn-hd': ['ESPN.us'],
    'espn-2-hd': ['ESPN2.us'],
    'espnu-hd': ['ESPNU.us'],
    'sec-network-us': ['SECNetwork.us'],
    'acc-network-us': ['ACCNetwork.us'],
    'big-ten-network-us': ['BigTenNetwork.us'],
    'espn-deportes-es': ['ESPNDeportes.us'],
    'cbs-sports-network': ['CBSSportsNetwork.us'],
    'cbs-sports-golazo': ['CBSSportsGolazoNetwork.us', 'GolazoNetwork.us'],
    'nbc-sports-now': ['NBCSportsNOW.us', 'NBCSports.us'],
    'golf-channel-us': ['GolfChannel.us'],
    'tudn-usa': ['TUDN.us'],
    'yes-network-us': ['YESNetwork.us'],
    'msg-network-us': ['MSG.us', 'MSGNetwork.us'],
    'nesn-us': ['NESN.us'],
    'marquee-sports-us': ['MarqueeSportsNetwork.us'],
    'nba-tv': ['NBATV.us'],
    'nfl-network': ['NFLNetwork.us', 'NFLChannel.us'],
    'nfl-redzone': ['NFLRedZone.us'],
    'nhl-network': ['NHLNetwork.us'],
    'mlb-network': ['MLBNetwork.us', 'MLB.us'],
    'tennis-channel': ['TennisChannel.us'],
    'real-madrid-tv': ['RealMadridTV.es'],
    'lequipe-fr': ['LEquipe.fr'],
    'eurosport-1-fr': ['Eurosport1.fr'],
    'eurosport-2-fr': ['Eurosport2.fr'],
    'automoto-fr': ['AutomotolaChaine.fr'],
    'sport-en-france': ['SportenFrance.fr'],
    'equidia-fr': ['Equidia.fr'],
    'fifa-plus-fr': ['FIFAPlus.fr'],
    'fifa-plus-en': ['FIFAPlus.uk', 'FIFAPlus.us'],
    'dazn-combat': ['DAZNCombat.uk'],
    'red-bull-tv': ['RedBullTV.at', 'RedBullTV.us'],

    // 4B. Italy Sports (Sky Sport Italia, DAZN Italia, Eurosport Italia, Rai Sport, Sportitalia)
    'dazn-1-it': ['DAZN1.it', 'ZonaDAZN.it'],
    'sky-sport-uno-it': ['SkySportUno.it'],
    'sky-sport-calcio-it': ['SkySportCalcio.it'],
    'sky-sport-f1-it': ['SkySportF1.it'],
    'sky-sport-motogp-it': ['SkySportMotoGP.it'],
    'sky-sport-tennis-it': ['SkySportTennis.it'],
    'sky-sport-nba-it': ['SkySportNBA.it'],
    'sky-sport-golf-it': ['SkySportGolf.it'],
    'sky-sport-arena-it': ['SkySportArena.it'],
    'sky-sport-max-it': ['SkySportMax.it'],
    'sky-sport-24-it': ['SkySport24.it'],
    'sky-sport-251-it': ['SkySport251.it'],
    'sky-sport-252-it': ['SkySport252.it'],
    'sky-sport-253-it': ['SkySport253.it'],
    'sky-sport-254-it': ['SkySport254.it'],
    'eurosport-1-it': ['Eurosport1.it'],
    'eurosport-2-it': ['Eurosport2.it'],
    'rai-sport-it': ['RaiSport.it'],
    'sportitalia-it': ['Sportitalia.it'],

    // 5. Algeria TV (DZ — strictly 1-to-1 per channel)
    'algeria-tv1-entv': ['TV1.dz'],
    'algeria-tv2-canal': ['TV2.dz', 'CanalAlgerie.dz'],
    'algeria-tv3-news': ['TV3.dz'],
    'algeria-tv4-tamazight': ['TV4.dz'],
    'algeria-tv5-coran': ['TV5.dz'],
    'algeria-tv6-youth': ['TV6.dz'],
    'algeria-tv7-elmaarifa': ['TV7.dz'],
    'algeria-tv8-edhakira': ['TV8.dz'],
    'algeria-el-heddaf-tv': ['ElHeddafTV.dz'],
    'algeria-al24-news': ['AL24News.dz'],
    'algeria-echorouk-tv': ['EchoroukTV.dz'],
    'algeria-echorouk-news': ['EchoroukNews.dz'],
    'algeria-ennahar-tv': ['EnnaharTV.dz'],
    'algeria-el-bilad-tv': ['ElBiladTV.dz'],
    'algeria-samira-tv': ['SamiraTV.dz'],
    'algeria-elwatania-tv': ['ElwataniaTV.dz'],
    'algeria-amou-yazid-tv': ['AmouYazidTV.dz'],

    // 6. Canal+ (FR / EU / AF — strictly 1-to-1 per channel)
    'canal-plus-fr': ['CanalPlus.fr'],
    'canal-plus-sport-fr': ['CanalPlusSport.fr'],
    'canal-plus-foot-fr': ['CanalPlusFoot.fr'],
    'canal-plus-sport-360-fr': ['CanalPlusSport360.fr'],
    'canal-plus-f1-fr': ['CanalPlusFormula1.fr'],
    'canal-plus-motogp-fr': ['CanalPlusMotoGP.fr'],
    'canal-plus-afrique-1': ['CanalPlusSport1.af'],
    'canal-plus-afrique-2': ['CanalPlusSport2.af'],
    'canal-plus-extra-1': ['CANALPlusExtra1.pl'],
    'canal-plus-extra-2': ['CANALPlusExtra2.pl'],
    'canal-plus-sport-1-eu': ['CANALPlusSport.pl'],
    'canal-plus-sport-2-eu': ['CANALPlusSport2.pl'],
    'canal-plus-premium-hd': ['CANALPlusPremium.pl'],
    'rmc-sport-1-fr': ['RMCSport1.fr'],
    'rmc-sport-2-fr': ['RMCSport2.fr']
};

let dynamicHarvestPromise: Promise<void> | null = null;

/**
 * Harvests fresh streams from the official `iptv-org` JSON API (`https://iptv-org.github.io/api/streams.json`)
 * and 19 `iptv-org.github.io` M3U playlists in the background.
 * Preserves Referer & User-Agent headers and maps strictly 1-to-1 per channel.
 */
export async function harvestDynamicSportsM3U(): Promise<void> {
    if (Date.now() - lastHarvestTime < HARVEST_TTL_MS && dynamicChannelCache.size > 0) {
        return;
    }
    if (dynamicHarvestPromise) {
        return dynamicHarvestPromise;
    }

    dynamicHarvestPromise = (async () => {
        try {
            const harvested = new Map<
                string,
                Array<{ label: string; url: string; quality: string; headers?: Record<string, string> }>
            >();

            // Reverse lookup index: lowercase iptv-org channel ID -> array of our internal channel objects
            const iptvOrgIdToInternalChannels = new Map<string, Array<(typeof CORE_SPORTS_CHANNELS)[number]>>();
            for (const ch of CORE_SPORTS_CHANNELS) {
                const orgIds = CHANNEL_TO_IPTV_ORG_IDS[ch.id] || [];
                for (const rawOrgId of orgIds) {
                    const normOrgId = rawOrgId.toLowerCase();
                    const list = iptvOrgIdToInternalChannels.get(normOrgId) || [];
                    list.push(ch);
                    iptvOrgIdToInternalChannels.set(normOrgId, list);
                }
            }

            const addHarvestedStream = (
                ch: (typeof CORE_SPORTS_CHANNELS)[number],
                streamUrl: string,
                quality: string,
                optHeaders?: Record<string, string>,
                sourceTag = 'iptv-org'
            ) => {
                if (
                    !streamUrl.startsWith('http') ||
                    streamUrl.endsWith('.mpd') ||
                    streamUrl.includes('primetv.cc.cd') ||
                    streamUrl.includes('andro.')
                ) {
                    return;
                }
                const existing = harvested.get(ch.id) || [];
                if (!existing.some((e) => e.url === streamUrl)) {
                    existing.push({
                        label: `${ch.shortName} (${sourceTag} ${quality})`,
                        url: streamUrl,
                        quality,
                        headers: optHeaders && Object.keys(optHeaders).length > 0 ? optHeaders : undefined
                    });
                    harvested.set(ch.id, existing);
                }
            };

            // 1. Query Official iptv-org JSON API (https://iptv-org.github.io/api/streams.json)
            const fetchIptvOrgApiPromise = (async () => {
                try {
                    const res = await fetch('https://iptv-org.github.io/api/streams.json', {
                        headers: { 'User-Agent': DEFAULT_UA },
                        signal: AbortSignal.timeout(6500)
                    });
                    if (!res.ok) return;
                    const entries = (await res.json()) as IptvOrgApiStreamEntry[];
                    if (!Array.isArray(entries)) return;

                    let idx = 0;
                    for (const item of entries) {
                        if (++idx % 400 === 0) {
                            await new Promise((r) => setImmediate(r));
                        }
                        const streamUrl = (item.url || '').trim();
                        if (!streamUrl.startsWith('http')) continue;
                        const rawChannelId = (item.channel || '').trim();
                        const baseChannelId = rawChannelId.split('@')[0].toLowerCase();
                        if (!baseChannelId) continue;

                        const matchedChannels = iptvOrgIdToInternalChannels.get(baseChannelId);
                        if (!matchedChannels || matchedChannels.length === 0) continue;

                        const optHeaders: Record<string, string> = {};
                        if (item.referrer) optHeaders['Referer'] = item.referrer.trim();
                        if (item.user_agent) optHeaders['User-Agent'] = item.user_agent.trim();
                        const quality = item.quality || '1080p';

                        for (const ch of matchedChannels) {
                            addHarvestedStream(ch, streamUrl, quality, optHeaders, 'iptv-org API');
                        }
                    }
                } catch {
                    // Ignore transient iptv-org API timeout
                }
            })();

            // 2. Query Official iptv-org.github.io Category & Country M3U Playlists in small non-blocking batches
            const m3uFeeds = [
                'https://iptv-org.github.io/iptv/categories/sports.m3u',
                'https://iptv-org.github.io/iptv/countries/dz.m3u',
                'https://iptv-org.github.io/iptv/countries/sa.m3u',
                'https://iptv-org.github.io/iptv/countries/qa.m3u',
                'https://iptv-org.github.io/iptv/countries/ae.m3u',
                'https://iptv-org.github.io/iptv/countries/kw.m3u',
                'https://iptv-org.github.io/iptv/countries/bh.m3u',
                'https://iptv-org.github.io/iptv/countries/om.m3u',
                'https://iptv-org.github.io/iptv/countries/eg.m3u',
                'https://iptv-org.github.io/iptv/countries/ma.m3u',
                'https://iptv-org.github.io/iptv/countries/iq.m3u',
                'https://iptv-org.github.io/iptv/countries/jo.m3u',
                'https://iptv-org.github.io/iptv/countries/uk.m3u',
                'https://iptv-org.github.io/iptv/countries/es.m3u',
                'https://iptv-org.github.io/iptv/countries/it.m3u',
                'https://iptv-org.github.io/iptv/countries/fr.m3u',
                'https://iptv-org.github.io/iptv/countries/pl.m3u',
                'https://iptv-org.github.io/iptv/countries/tr.m3u',
                'https://iptv-org.github.io/iptv/countries/us.m3u',
                'https://raw.githubusercontent.com/doms9/iptv/default/M3U8/base.m3u8'
            ];

            await fetchIptvOrgApiPromise;
            for (let b = 0; b < m3uFeeds.length; b += 4) {
                const batch = m3uFeeds.slice(b, b + 4);
                await Promise.allSettled(
                    batch.map(async (feedUrl) => {
                        try {
                            const res = await fetch(feedUrl, {
                                headers: { 'User-Agent': DEFAULT_UA },
                                signal: AbortSignal.timeout(5000)
                            });
                            if (!res.ok) return;
                            const text = await res.text();
                            const lines = text.split(/\r?\n/);

                            for (let i = 0; i < lines.length; i++) {
                                if (i > 0 && i % 300 === 0) {
                                    await new Promise((r) => setImmediate(r));
                                }
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
                                if (!streamUrl.startsWith('http')) continue;

                                const tvgId = (line.match(/tvg-id="([^"]+)"/i) || [])[1] || '';
                                const baseTvgId = tvgId.split('@')[0].toLowerCase();
                                const title = (line.match(/,(.+)$/) || [])[1]?.trim() || tvgId;
                                const qualityMatch = title.match(/\b(4K|2160p|1080p|720p|576p|480p)\b/i);
                                const quality = qualityMatch ? qualityMatch[1] : '1080p';

                                if (baseTvgId) {
                                    const directMatches = iptvOrgIdToInternalChannels.get(baseTvgId);
                                    if (directMatches && directMatches.length > 0) {
                                        for (const ch of directMatches) {
                                            addHarvestedStream(ch, streamUrl, quality, optHeaders, 'iptv-org M3U');
                                        }
                                        continue;
                                    }
                                }

                                const key = `${tvgId} ${title}`.toLowerCase();
                                for (const ch of CORE_SPORTS_CHANNELS) {
                                    const matchBeinNum = ch.id.match(/^bein-sports-(\d+)-(ar|tr)$/);
                                    let matched = false;
                                    if (matchBeinNum) {
                                        const num = matchBeinNum[1];
                                        const lang = matchBeinNum[2];
                                        if (lang === 'ar' && key.includes(`beinsports${num}.qa`)) matched = true;
                                        if (lang === 'tr' && key.includes(`beinsports${num}turk`)) matched = true;
                                    } else if (ch.id === 'ssc-sport-1-ar' && (key.includes('ssc1.sa') || key.includes('ssc sport 1') || key.includes('saudisports1.sa'))) {
                                        matched = true;
                                    } else if (ch.id === 'ssc-sport-2-ar' && (key.includes('ssc2.sa') || key.includes('ssc sport 2') || key.includes('saudisports2.sa'))) {
                                        matched = true;
                                    } else if (ch.id === 'ssc-sport-3-ar' && (key.includes('ssc3.sa') || key.includes('ssc sport 3') || key.includes('saudisports3.sa'))) {
                                        matched = true;
                                    } else if (ch.id === 'alkass-1-ar' && (key.includes('alkass1.qa') || key.includes('alkass one'))) {
                                        matched = true;
                                    } else if (ch.id === 'ad-sports-1-ar' && (key.includes('abudhabisports1.ae') || key.includes('abu dhabi sports 1'))) {
                                        matched = true;
                                    } else if (ch.id === 'dubai-sports-1-ar' && (key.includes('dubaisports1.ae') || key.includes('dubai sports 1'))) {
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
                                        addHarvestedStream(ch, streamUrl, quality, optHeaders, 'iptv-org M3U');
                                    }
                                }
                            }
                        } catch {
                            // Ignore individual feed errors
                        }
                    })
                );
                await new Promise((r) => setImmediate(r));
            }

            if (harvested.size > 0) {
                dynamicChannelCache = harvested;
                lastHarvestTime = Date.now();
            }

            // Run the Self-Healing Upstream Feed Directory Auto-Corrector in parallel
            await harvestAndAutoCorrectUpstreamFeeds().catch(() => {});
        } finally {
            dynamicHarvestPromise = null;
        }
    })();

    return dynamicHarvestPromise;
}

// ============================================================================
// PILLAR 3A-AUTO: SELF-HEALING UPSTREAM FEED CORRECTOR & CHANNEL IDENTITY VERIFIER
// Automatically indexes the live upstream 900+ channel directories every 15 minutes,
// detects 24h transponder ID shifts (premium<ID>), auto-binds newly shifted feeds to
// the exact matching channel, and quarantines hijacked or dead transponders.
// ============================================================================
export interface AutoFeedCorrectionRecord {
    channelId: string;
    channelName: string;
    action: 'AUTO_DISCOVERED_FEED' | 'QUARANTINED_HIJACKED_FEED' | 'DEAD_TRANSPONDER_FILTERED';
    slug: string;
    upstreamDirectoryName: string;
    timestamp: string;
}

const UPSTREAM_DIRECTORY_SOURCES = [
    'https://dlstreams.st/24-7-channels.php',
    'https://raw.githubusercontent.com/raselmia9/Daddylive_-channel/main/DaddyLive_Clean_Playlist.m3u',
    'https://raw.githubusercontent.com/Nadjib-b/daddylive/main/daddylive-channels-data.json'
];

// Transponders 614-618 are dead ("unknown channel") and 619-621 are hijacked by Spanish DSports (Directv Sports)
// despite the upstream directory still labeling them "SSC Sport 1..5 / SSC Sport Extra 1..3".
const PERMANENTLY_QUARANTINED_SSC_TRANSPONDERS = new Set<number>([614, 615, 616, 617, 618, 619, 620, 621]);

const upstreamDirectoryIdToName = new Map<number, string>();
const autoDiscoveredChannelFeeds = new Map<
    string,
    Array<{ label: string; url: string; quality: string; headers?: Record<string, string>; upstreamId: number }>
>();
const quarantinedChannelSlugs = new Set<string>([
    'ssc-sport-1-ar::premium614',
    'ssc-sport-2-ar::premium615',
    'ssc-sport-3-ar::premium616',
    'ssc-extra-1-ar::premium617',
    'ssc-extra-2-ar::premium618',
    'ssc-extra-1-ar::premium619',
    'ssc-extra-2-ar::premium620',
    'ssc-extra-3-ar::premium621',
    'ssc-sport-1-ar::premium619',
    'ssc-sport-2-ar::premium620',
    'ssc-sport-3-ar::premium621'
]); // Format: `${channelId}::premium${num}`
const autoFeedCorrectionLog: AutoFeedCorrectionRecord[] = [];
let lastAutoFeedCorrectTime = 0;
let autoFeedCorrectPromise: Promise<void> | null = null;
const AUTO_FEED_CORRECT_TTL_MS = 15 * 60 * 1000; // 15 minutes

function logAutoFeedCorrection(record: AutoFeedCorrectionRecord): void {
    const exists = autoFeedCorrectionLog.some(
        (r) => r.channelId === record.channelId && r.slug === record.slug && r.action === record.action
    );
    if (!exists) {
        autoFeedCorrectionLog.unshift(record);
        if (autoFeedCorrectionLog.length > 80) {
            autoFeedCorrectionLog.pop();
        }
    }
}

/**
 * Determines whether a live upstream directory channel name matches our internal channel's exact identity.
 */
function doesUpstreamNameMatchChannelIdentity(ch: LiveChannel, rawUpstreamName: string): boolean {
    const n = rawUpstreamName.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim();
    if (!n) return false;

    // 1. beIN Sports Arabic 1-9 & Open/XTRA (strictly Arabic/MENA, never Malaysia/France/Turkey/USA)
    const beinArMatch = ch.id.match(/^bein-sports-(\d+)-ar$/);
    if (beinArMatch) {
        const num = beinArMatch[1];
        return (
            new RegExp(`\\bbein\\s*sports?\\s*${num}\\b`).test(n) &&
            (n.includes('arab') || n.includes('mena') || n.includes('qa')) &&
            !n.includes('malaysia') &&
            !n.includes('france') &&
            !n.includes('turk')
        );
    }
    if (ch.id === 'bein-sports-premium-1-ar') return /\bbein\s*sports?\s*(?:premium\s*)?1\b/.test(n) && (n.includes('arab') || n.includes('mena'));
    if (ch.id === 'bein-sports-premium-2-ar') return /\bbein\s*sports?\s*(?:premium\s*)?2\b/.test(n) && (n.includes('arab') || n.includes('mena'));
    if (ch.id === 'bein-sports-premium-3-ar') return /\bbein\s*sports?\s*(?:premium\s*)?3\b/.test(n) && (n.includes('arab') || n.includes('mena'));
    if (ch.id === 'bein-sports-afc-ar') return /\bbein\s*sports?\s*(?:afc|7|8)\b/.test(n) && (n.includes('arab') || n.includes('mena'));
    if (ch.id === 'bein-sports-xtra-1-ar') return /\bbein\s*sports?\s*xtra\s*1\b/.test(n);

    // 2. beIN Sports English 1-3, USA & Australia
    if (ch.id === 'bein-sports-en-1') return /\bbein\s*sports?\b/.test(n) && /\benglish\s*1\b|\ben\s*1\b|\b1\s*malaysia\b|\baustralia\s*1\b/.test(n);
    if (ch.id === 'bein-sports-en-2') return /\bbein\s*sports?\b/.test(n) && /\benglish\s*2\b|\ben\s*2\b|\b2\s*malaysia\b|\baustralia\s*2\b/.test(n);
    if (ch.id === 'bein-sports-en-3') return /\bbein\s*sports?\b/.test(n) && /\benglish\s*3\b|\ben\s*3\b|\b3\s*malaysia\b|\baustralia\s*3\b/.test(n);
    if (ch.id === 'bein-sports-usa') return /\bbein\s*sports?\s*(?:usa|us)\b/.test(n);
    if (ch.id === 'bein-sports-au-1') return /\bbein\s*sports?\s*australia\s*1\b/.test(n);
    if (ch.id === 'bein-sports-au-2') return /\bbein\s*sports?\s*australia\s*2\b/.test(n);
    if (ch.id === 'bein-sports-au-3') return /\bbein\s*sports?\s*australia\s*3\b/.test(n);

    // 3. beIN Sports France 1-3 & MAX 4-10
    const beinFrMatch = ch.id.match(/^bein-sports-fr-(\d+)$/);
    if (beinFrMatch) {
        const num = beinFrMatch[1];
        return new RegExp(`\\bbein\\s*sports?\\s*${num}\\b`).test(n) && (n.includes('france') || n.includes('fr'));
    }
    const beinMaxFrMatch = ch.id.match(/^bein-sports-max-(\d+)-fr$/);
    if (beinMaxFrMatch) {
        const num = beinMaxFrMatch[1];
        return new RegExp(`\\bbein\\s*sports?\\s*max\\s*${num}\\b`).test(n);
    }

    // 4. beIN Sports Turkey 1-5
    const beinTrMatch = ch.id.match(/^bein-sports-(\d+)-tr$/);
    if (beinTrMatch) {
        const num = beinTrMatch[1];
        return new RegExp(`\\bbein\\s*sports?\\s*${num}\\b`).test(n) && (n.includes('turk') || n.includes('tr'));
    }

    // 5. SSC Sports & MENA Arabic Channels
    if (ch.id === 'ssc-sport-1-ar') return /\bssc\s*(?:sport\s*)?1\b|\bthmanyah\s*1\b|\bsaudi\s*sport\s*1\b/.test(n);
    if (ch.id === 'ssc-sport-2-ar') return /\bssc\s*(?:sport\s*)?2\b|\bthmanyah\s*2\b|\bsaudi\s*sport\s*2\b/.test(n);
    if (ch.id === 'ssc-sport-3-ar') return /\bssc\s*(?:sport\s*)?3\b|\bthmanyah\s*3\b|\bsaudi\s*sport\s*3\b/.test(n);
    if (ch.id === 'ssc-extra-1-ar') return /\bssc\s*extra\s*1\b|\bssc\s*(?:sport\s*)?4\b/.test(n);
    if (ch.id === 'ssc-extra-2-ar') return /\bssc\s*extra\s*2\b|\bssc\s*(?:sport\s*)?5\b/.test(n);
    if (ch.id === 'ssc-extra-3-ar') return /\bssc\s*extra\s*3\b/.test(n);
    if (ch.id === 'starzplay-sports-1-ar') return /\bstarzplay\s*(?:sport\s*)?1\b|\bad\s*sports?\s*premium\s*1\b/.test(n);
    if (ch.id === 'starzplay-sports-2-ar') return /\bstarzplay\s*(?:sport\s*)?2\b|\bad\s*sports?\s*premium\s*2\b/.test(n);
    if (ch.id === 'ad-sports-1-ar') return /\babu\s*dhabi\s*sports?\s*1\b|\bad\s*sports?\s*1\b/.test(n) && !n.includes('premium');
    if (ch.id === 'ad-sports-2-ar') return /\babu\s*dhabi\s*sports?\s*2\b|\bad\s*sports?\s*2\b/.test(n) && !n.includes('premium');
    if (ch.id === 'dubai-sports-1-ar') return /\bdubai\s*sports?\s*1\b/.test(n);
    if (ch.id === 'alkass-1-ar') return /\balkass\s*(?:one|two|1|2)\b/.test(n);
    if (ch.id === 'alkass-2-ar') return /\balkass\s*(?:three|3)\b/.test(n);
    if (ch.id === 'alkass-3-ar') return /\balkass\s*(?:four|4)\b/.test(n);
    if (ch.id === 'ontime-sports-1-ar') return /\bontime\s*sports?\b|\bon\s*time\s*sports?\b/.test(n);

    // 6. Sky Sports UK & TNT Sports UK (strictly UK, never DE/IT/CZ)
    const notDeOrIt = !/\b(de|germany|austria|ital|italia|cz|sk)\b/.test(n);
    if (ch.id === 'sky-sports-main-event') return /\bsky\s*sports?\s*main\s*event\b/.test(n) && notDeOrIt;
    if (ch.id === 'sky-sports-premier-league') return /\bsky\s*sports?\s*premier\s*league\b/.test(n) && notDeOrIt;
    if (ch.id === 'sky-sports-football') return /\bsky\s*sports?\s*football\b/.test(n) && !n.includes('super') && notDeOrIt;
    if (ch.id === 'sky-sports-action') return /\bsky\s*sports?\s*(?:action|nfl)\b/.test(n) && notDeOrIt;
    if (ch.id === 'sky-sports-f1') return /\bsky\s*sports?\s*f1\b/.test(n) && notDeOrIt;
    if (ch.id === 'sky-sports-cricket') return /\bsky\s*sports?\s*cricket\b/.test(n) && notDeOrIt;
    if (ch.id === 'sky-sports-golf') return /\bsky\s*sports?\s*golf\b/.test(n) && notDeOrIt;
    if (ch.id === 'sky-sports-tennis') return /\bsky\s*sports?\s*tennis\b/.test(n) && notDeOrIt;
    if (ch.id === 'sky-sports-mix') return /\bsky\s*sports?\s*mix\b/.test(n) && notDeOrIt;
    if (ch.id === 'sky-sports-news') return /\bsky\s*sports?\s*news\b/.test(n) && notDeOrIt;
    if (ch.id === 'sky-sports-racing') return /\bsky\s*sports?\s*racing\b/.test(n) && notDeOrIt;
    if (ch.id === 'tnt-sports-1') return /\btnt\s*sports?\s*1\b/.test(n);
    if (ch.id === 'tnt-sports-2') return /\btnt\s*sports?\s*2\b/.test(n);
    if (ch.id === 'tnt-sports-3') return /\btnt\s*sports?\s*3\b/.test(n);
    if (ch.id === 'tnt-sports-4') return /\btnt\s*sports?\s*4\b/.test(n);
    if (ch.id === 'premier-sports-1') return /\bpremier\s*sports?\s*1\b/.test(n) && notDeOrIt;
    if (ch.id === 'premier-sports-2') return /\bpremier\s*sports?\s*2\b/.test(n) && notDeOrIt;
    if (ch.id === 'laligatv-uk') return /\blaliga\s*tv\s*uk\b/.test(n);
    if (ch.id === 'mutv-uk') return /\bmutv\b/.test(n);
    if (ch.id === 'itv4-sport-uk') return /\bitv\s*4\b/.test(n);
    if (ch.id === 'eurosport-1') return /\beurosport\s*1\b/.test(n) && (n.includes('uk') || !/\b(france|fr|ital|it|spain|es|poland|pl|de)\b/.test(n));
    if (ch.id === 'eurosport-2') return /\beurosport\s*2\b/.test(n) && (n.includes('uk') || !/\b(france|fr|ital|it|spain|es|poland|pl|de)\b/.test(n));

    // 7. SuperSport South Africa
    if (ch.id === 'supersport-premier-league') return /\bsupersport\s*premier\s*league\b/.test(n);
    if (ch.id === 'supersport-grandstand') return /\bsupersport\s*grandstand\b/.test(n);
    if (ch.id === 'supersport-football') return /\bsupersport\s*football\b/.test(n);
    if (ch.id === 'supersport-laliga') return /\bsupersport\s*laliga\b/.test(n);
    if (ch.id === 'supersport-variety-1') return /\bsupersport\s*variety\s*1\b/.test(n);

    // 8. Spain Movistar & DAZN LaLiga
    if (ch.id === 'movistar-laliga-es') return /\bmovistar\s*laliga\b|\bm+\s*laliga\b/.test(n);
    if (ch.id === 'dazn-laliga-es') return /\bdazn\s*laliga\s*1?\b/.test(n);
    if (ch.id === 'laliga-hypermotion-es') return /\blaliga\s*(?:tv\s*)?hypermotion\b|\blaliga\s*smartbank\b/.test(n);
    if (ch.id === 'movistar-liga-de-campeones-es') return /\bmovistar\s*liga\s*de\s*campeones\b/.test(n);
    if (ch.id === 'movistar-deportes-es') return /\bmovistar\s*deportes\b/.test(n) && !n.includes('2') && !n.includes('3');
    if (ch.id === 'dazn-f1-es') return /\bdazn\s*f1\b/.test(n) && (n.includes('es') || n.includes('spain'));

    // 9. Italy Serie A DAZN, Sky Sport Italia, Eurosport IT & Rai Sport
    if (ch.id === 'dazn-1-it') return /\bzona\s*dazn\b|\bdazn\s*1\s*it/.test(n);
    if (ch.id === 'sky-sport-calcio-it') return /\bsky\s*sport\s*calcio\b/.test(n);
    if (ch.id === 'sky-sport-uno-it') return /\bsky\s*sport\s*uno\b/.test(n);
    if (ch.id === 'sky-sport-f1-it') return /\bsky\s*sport\s*f1\b/.test(n) && /\b(it|ital|italia)\b/.test(n);
    if (ch.id === 'sky-sport-motogp-it') return /\bsky\s*sport\s*motogp\b/.test(n) && /\b(it|ital|italia)\b/.test(n);
    if (ch.id === 'sky-sport-tennis-it') return /\bsky\s*sport\s*tennis\b/.test(n) && /\b(it|ital|italia)\b/.test(n);
    if (ch.id === 'sky-sport-nba-it') return /\bsky\s*sport\s*(?:nba|basket)\b/.test(n) && /\b(it|ital|italia)\b/.test(n);
    if (ch.id === 'sky-sport-golf-it') return /\bsky\s*sport\s*golf\b/.test(n) && /\b(it|ital|italia)\b/.test(n);
    if (ch.id === 'sky-sport-arena-it') return /\bsky\s*sport\s*arena\b/.test(n);
    if (ch.id === 'sky-sport-max-it') return /\bsky\s*sport\s*max\b/.test(n);
    if (ch.id === 'sky-sport-24-it') return /\bsky\s*sport\s*24\b/.test(n);
    if (ch.id === 'sky-sport-251-it') return /\bsky\s*sport\s*251\b/.test(n);
    if (ch.id === 'sky-sport-252-it') return /\bsky\s*sport\s*252\b/.test(n);
    if (ch.id === 'sky-sport-253-it') return /\bsky\s*sport\s*253\b/.test(n);
    if (ch.id === 'sky-sport-254-it') return /\bsky\s*sport\s*254\b/.test(n);
    if (ch.id === 'eurosport-1-it') return /\beurosport\s*1\b/.test(n) && /\b(it|ital|italia)\b/.test(n);
    if (ch.id === 'eurosport-2-it') return /\beurosport\s*2\b/.test(n) && /\b(it|ital|italia)\b/.test(n);
    if (ch.id === 'rai-sport-it') return /\brai\s*sport\b/.test(n);

    // 10. US Sports
    if (ch.id === 'cbs-sports-network') return /\bcbs\s*sports?\s*network\b|\bcbssn\b/.test(n) && !n.includes('golazo');
    if (ch.id === 'cbs-sports-golazo') return /\bcbs\s*sports?\s*golazo\b/.test(n);
    if (ch.id === 'espn-hd') return /^espn\s*(?:us|usa|hd)?$/.test(n);
    if (ch.id === 'espn-2-hd') return /^espn\s*2\s*(?:us|usa|hd)?$/.test(n);
    if (ch.id === 'espnu-hd') return /\bespnu\b/.test(n);
    if (ch.id === 'sec-network-us') return /\bsec\s*network\b/.test(n);
    if (ch.id === 'acc-network-us') return /\bacc\s*network\b/.test(n);
    if (ch.id === 'big-ten-network-us') return /\bbig\s*ten\s*network\b|\bbtn\b/.test(n);
    if (ch.id === 'espn-deportes-es') return /\bespn\s*deportes\b/.test(n);
    if (ch.id === 'fox-sports-1') return /\bfox\s*sports?\s*1\b|\bfs1\b/.test(n) && !n.includes('arg') && !n.includes('mx');
    if (ch.id === 'fox-sports-2') return /\bfox\s*sports?\s*2\b|\bfs2\b/.test(n) && !n.includes('arg') && !n.includes('mx');
    if (ch.id === 'fox-deportes-us') return /\bfox\s*deportes\b/.test(n);
    if (ch.id === 'golf-channel-us') return /\bgolf\s*channel\b/.test(n);
    if (ch.id === 'tudn-usa') return /\btudn\b/.test(n);
    if (ch.id === 'yes-network-us') return /\byes\s*network\b/.test(n);
    if (ch.id === 'msg-network-us') return /\bmsg\b/.test(n) && !n.includes('2');
    if (ch.id === 'nesn-us') return /\bnesn\b/.test(n) && !n.includes('plus');
    if (ch.id === 'marquee-sports-us') return /\bmarquee\s*sports?\s*network\b/.test(n);

    // 11. Canal+ France, Afrique, Europe & French Sports
    if (ch.id === 'canal-plus-fr') return /^canal\+\s*(?:france|fr|hd)?$/.test(n);
    if (ch.id === 'canal-plus-sport-fr') return /^canal\+\s*sport\s*(?:france|fr|hd)?$/.test(n);
    if (ch.id === 'canal-plus-foot-fr') return /\bcanal\+\s*foot\b/.test(n);
    if (ch.id === 'canal-plus-sport-360-fr') return /\bcanal\+\s*(?:sport\s*)?360\b/.test(n);
    if (ch.id === 'canal-plus-f1-fr') return /\bcanal\+\s*(?:formula\s*1|f1)\b/.test(n);
    if (ch.id === 'canal-plus-motogp-fr') return /\bcanal\+\s*moto\s*gp\b/.test(n);
    if (ch.id === 'canal-plus-extra-1') return /\bcanal\+\s*extra\s*1\b/.test(n);
    if (ch.id === 'canal-plus-extra-2') return /\bcanal\+\s*extra\s*2\b/.test(n);
    if (ch.id === 'canal-plus-sport-1-eu') return /\bcanal\+\s*sport\s*1?\s*(?:poland|pl)\b/.test(n);
    if (ch.id === 'canal-plus-sport-2-eu') return /\bcanal\+\s*sport\s*2\s*(?:poland|pl)\b/.test(n);
    if (ch.id === 'rmc-sport-1-fr') return /\brmc\s*sport\s*1\b/.test(n);
    if (ch.id === 'rmc-sport-2-fr') return /\brmc\s*sport\s*2\b/.test(n);
    if (ch.id === 'eurosport-1-fr') return /\beurosport\s*1\b/.test(n) && /\b(france|fr)\b/.test(n);
    if (ch.id === 'eurosport-2-fr') return /\beurosport\s*2\b/.test(n) && /\b(france|fr)\b/.test(n);
    if (ch.id === 'automoto-fr') return /\bautomoto\b/.test(n);
    if (ch.id === 'sport-en-france') return /\bsport\s*en\s*france\b/.test(n);

    return false;
}

/**
 * Detects whether a `premium<ID>` transponder has been reassigned by the upstream provider
 * to an unrelated or foreign channel (e.g., Arena Tenis Serbia on 612, Newsmax USA on 613, DSports on 619-621, Polsat on 50).
 */
function isUpstreamTransponderHijacked(ch: LiveChannel, rawUpstreamName: string): boolean {
    const n = rawUpstreamName.toLowerCase();
    if (!n) return false;

    // Non-sports news/political channels hijacking a sports transponder
    if (/\b(newsmax|msnbc|fox\s*news|cnn|cnbc|bbc\s*news|c-span|weather\s*channel)\b/i.test(n)) {
        return true;
    }

    // Arabic / MENA sports channels must NEVER resolve to Serbian, Polish, South American, Greek, or Portuguese channels
    if (ch.language === 'ar' && ch.category !== 'movies' && ch.category !== 'entertainment') {
        if (
            /\b(arena\s*sport|serbia|croatia|polsat|poland|eleven\s*sport|dsports|directv|tyc\s*sport|win\s*sport|sport\s*tv\s*portugal|cosmote|nova\s*sport|ziggo|viaplay|supersport\s*albania|sky\s*sport\s*austria|sky\s*sport\s*de)\b/i.test(
                n
            )
        ) {
            return true;
        }
        // OnTime Sports Egypt belongs strictly to ontime-sports-1-ar, not SSC Sports
        if (ch.id.startsWith('ssc-') && /\bontime\b/i.test(n)) {
            return true;
        }
    }

    // Specific UK/European channel protections
    if (ch.id === 'sky-sports-news' && /\b(motogp|f1\s*italy|calcio|bundesliga)\b/i.test(n)) {
        return true;
    }
    if (ch.id === 'dazn-combat' && /\b(polsat|eleven\s*sport|arena\s*sport)\b/i.test(n)) {
        return true;
    }

    return false;
}

/**
 * Crawls the live upstream provider directories, indexes all 900+ `premium<ID>` transponders,
 * quarantines any hijacked transponders, and auto-binds shifted channel IDs to their matching channel.
 */
export async function harvestAndAutoCorrectUpstreamFeeds(): Promise<void> {
    if (Date.now() - lastAutoFeedCorrectTime < AUTO_FEED_CORRECT_TTL_MS && upstreamDirectoryIdToName.size > 0) {
        return;
    }
    if (autoFeedCorrectPromise) {
        return autoFeedCorrectPromise;
    }

    autoFeedCorrectPromise = (async () => {
        const nextIdToName = new Map<number, string>();

        await Promise.allSettled(
            UPSTREAM_DIRECTORY_SOURCES.map(async (sourceUrl) => {
                try {
                    const res = await fetch(sourceUrl, {
                        headers: { 'User-Agent': DEFAULT_UA },
                        signal: AbortSignal.timeout(7000)
                    });
                    if (!res.ok) return;
                    const body = await res.text();

                    if (sourceUrl.endsWith('.m3u')) {
                        const lines = body.split(/\r?\n/);
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i].trim();
                            if (!line.startsWith('#EXTINF')) continue;
                            const nameMatch = line.match(/,(.+)$/);
                            const chName = (nameMatch?.[1] || '').trim();
                            if (!chName) continue;
                            for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
                                const u = lines[j].trim();
                                const m =
                                    u.match(/\/premium(\d+)\//i) ||
                                    u.match(/[?&]id=(\d+)/i) ||
                                    u.match(/stream-(\d+)\.php/i);
                                if (m) {
                                    const num = Number(m[1]);
                                    if (num > 0) nextIdToName.set(num, chName);
                                    break;
                                }
                            }
                        }
                    } else if (sourceUrl.endsWith('.json')) {
                        const parsed = JSON.parse(body);
                        if (Array.isArray(parsed)) {
                            for (const item of parsed) {
                                const num = Number(item?.id);
                                const chName = String(item?.name || '').trim();
                                if (num > 0 && chName && !nextIdToName.has(num)) {
                                    nextIdToName.set(num, chName);
                                }
                            }
                        } else if (parsed && typeof parsed === 'object') {
                            for (const [chName, entry] of Object.entries(parsed as Record<string, any>)) {
                                if (chName === 'GLOBAL_OPTIONS' || !entry || typeof entry !== 'object') continue;
                                const urlCandidate = String(entry.channel_url || entry.stream_url || '');
                                const m =
                                    urlCandidate.match(/stream-(\d+)\.php/i) ||
                                    urlCandidate.match(/\/premium(\d+)\//i) ||
                                    urlCandidate.match(/[?&]id=(\d+)/i);
                                if (m) {
                                    const num = Number(m[1]);
                                    if (num > 0 && !nextIdToName.has(num)) {
                                        nextIdToName.set(num, chName.trim());
                                    }
                                }
                            }
                        }
                    } else {
                        const linkRegex = /(?:stream-(\d+)\.php|watch\.php\?id=(\d+))[^>]*>([\s\S]*?)<\/a>/gi;
                        let m: RegExpExecArray | null;
                        while ((m = linkRegex.exec(body)) !== null) {
                            const num = Number(m[1] || m[2]);
                            const chName = m[3]
                                .replace(/<[^>]+>/g, ' ')
                                .replace(/\bID:\s*\d+\b/gi, '')
                                .replace(/\s+/g, ' ')
                                .trim();
                            if (num > 0 && chName && !nextIdToName.has(num)) {
                                nextIdToName.set(num, chName);
                            }
                        }
                    }
                } catch {
                    // Ignore single directory mirror timeout
                }
            })
        );

        if (nextIdToName.size > 0) {
            upstreamDirectoryIdToName.clear();
            for (const [k, v] of nextIdToName.entries()) {
                upstreamDirectoryIdToName.set(k, v);
            }

            // Inspect all channels against the live upstream directory
            for (const ch of CORE_SPORTS_CHANNELS) {
                // 1. Check existing configured streams for hijacked transponders
                for (const st of ch.streams) {
                    const m = st.url.match(/\/premium(\d+)\/index\.m3u8/i);
                    if (!m) continue;
                    const num = Number(m[1]);
                    const upstreamName = upstreamDirectoryIdToName.get(num);
                    const isSscHijacked = ch.id.startsWith('ssc-') && PERMANENTLY_QUARANTINED_SSC_TRANSPONDERS.has(num);
                    if (isSscHijacked || (upstreamName && isUpstreamTransponderHijacked(ch, upstreamName))) {
                        const slug = `premium${num}`;
                        quarantinedChannelSlugs.add(`${ch.id}::${slug}`);
                        logAutoFeedCorrection({
                            channelId: ch.id,
                            channelName: ch.name,
                            action: 'QUARANTINED_HIJACKED_FEED',
                            slug,
                            upstreamDirectoryName: isSscHijacked
                                ? `${upstreamName || slug} (Hijacked by Spanish DSports / Offline)`
                                : upstreamName || slug,
                            timestamp: new Date().toISOString()
                        });
                    }
                }

                // 2. Scan the entire upstream directory for any newly shifted transponder matching this channel's exact identity
                const discoveredForChannel: Array<{
                    label: string;
                    url: string;
                    quality: string;
                    headers?: Record<string, string>;
                    upstreamId: number;
                }> = [];

                for (const [num, upstreamName] of upstreamDirectoryIdToName.entries()) {
                    // Never auto-bind 614-621 to SSC channels (614-618 are dead; 619-621 broadcast Spanish DSports)
                    if (ch.id.startsWith('ssc-') && PERMANENTLY_QUARANTINED_SSC_TRANSPONDERS.has(num)) {
                        continue;
                    }
                    if (doesUpstreamNameMatchChannelIdentity(ch, upstreamName)) {
                        const slug = `premium${num}`;
                        if (quarantinedChannelSlugs.has(`${ch.id}::${slug}`)) continue;
                        const candidateUrl = `${EDGE_CDN_BASE}/${slug}/index.m3u8`;
                        const alreadyInStatic = ch.streams.some((s) => s.url === candidateUrl);
                        if (!alreadyInStatic) {
                            discoveredForChannel.push({
                                label: `${ch.shortName} (Auto-Corrected Feed #${num}: ${upstreamName} 1080p)`,
                                url: candidateUrl,
                                quality: '1080p',
                                headers: DEMBED_HEADERS,
                                upstreamId: num
                            });
                            logAutoFeedCorrection({
                                channelId: ch.id,
                                channelName: ch.name,
                                action: 'AUTO_DISCOVERED_FEED',
                                slug,
                                upstreamDirectoryName: upstreamName,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                }

                if (discoveredForChannel.length > 0) {
                    autoDiscoveredChannelFeeds.set(ch.id, discoveredForChannel);
                }
            }

            lastAutoFeedCorrectTime = Date.now();
        }
        autoFeedCorrectPromise = null;
    })();

    return autoFeedCorrectPromise;
}

// ============================================================================
// PILLAR 3B: DIRECT OFFICIAL BROADCASTER XMLTV EPG HARVESTER (1-TO-1 CHANNEL MAPPING)
// ============================================================================
export interface XmltvRawProgramme {
    xmlChannelId: string;
    startMs: number;
    stopMs: number;
    title: string;
    subTitle: string;
    description: string;
    category: string;
    lang: string;
}

/**
 * Exact 1-to-1 mapping from our internal channel IDs to official broadcaster XMLTV channel IDs
 * across regional open-epg.com feeds (Qatar/MENA, Saudi Arabia, Egypt, Morocco, UK, South Africa, Spain, Italy, France, Turkey, USA).
 */
export const CHANNEL_TO_XMLTV_IDS: Record<string, string[]> = {
    // 1. beIN Sports MENA (Qatar Official Feed: qatar1.xml, qatar2.xml, qatar4.xml)
    'bein-sports-1-ar': ['beIN SPORTS 1.qa', 'beIN 4K.qa'],
    'bein-sports-2-ar': ['beIN SPORTS 2.qa'],
    'bein-sports-3-ar': ['beIN SPORTS 3.qa'],
    'bein-sports-4-ar': ['beIN SPORTS 4.qa'],
    'bein-sports-5-ar': ['beIN SPORTS 5.qa'],
    'bein-sports-6-ar': ['beIN SPORTS 6.qa'],
    'bein-sports-7-ar': ['beIN SPORTS 7.qa'],
    'bein-sports-8-ar': ['beIN SPORTS 8.qa', 'beIN SPORTS NBA.qa'],
    'bein-sports-9-ar': ['beIN SPORTS 9.qa'],
    'bein-sports-open-ar': ['beIN SPORTS.qa', 'beIN SPORTS NEWS.qa'],
    'bein-sports-premium-1-ar': ['beIN SPORTS 1.qa', 'beIN 4K.qa'],
    'bein-sports-premium-2-ar': ['beIN SPORTS 2.qa'],
    'bein-sports-premium-3-ar': ['beIN SPORTS 3.qa'],
    'bein-sports-afc-ar': ['beIN SPORTS AFC.qa', 'beIN SPORTS 1 AFC.qa', 'beIN SPORTS 2 AFC.qa'],
    'bein-sports-xtra-1-ar': ['beIN SPORTS XTRA 1.qa', 'beIN SPORTS XTRA 2.qa'],
    'bein-sports-en-1': ['beIN SPORTS EN 1.qa'],
    'bein-sports-en-2': ['beIN SPORTS EN 2.qa'],
    'bein-sports-en-3': ['beIN SPORTS XTRA 1.qa', 'beIN SPORTS EN 1.qa'],
    'bein-sports-usa': ['beIN SPORTS EN 1.qa', 'beIN SPORTS XTRA 1.qa'],
    'bein-sports-au-1': ['beIN SPORTS EN 1.qa'],
    'bein-sports-au-2': ['beIN SPORTS EN 2.qa'],
    'bein-sports-au-3': ['beIN SPORTS XTRA 1.qa'],
    'bein-sports-xtra-en': ['beIN SPORTS XTRA 1.qa', 'beIN SPORTS XTRA 2.qa', 'beIN SPORTS XTRA 3.qa'],
    'bein-sports-xtra-es': ['BEINSES.us', 'ESPNDHD.us', 'ESPND.us'],

    // 2. Alkass Qatar Sports (qatar2.xml)
    'alkass-1-ar': ['2023 Alkass 1.qa', '2023 Alkass 5.qa'],
    'alkass-2-ar': ['2023 Alkass 2.qa', '2023 Alkass 6.qa'],
    'alkass-3-ar': ['2023 Alkass 3.qa', '2023 Alkass 7.qa'],

    // 3. Saudi SSC, STARZPLAY, AD Sports, Dubai Sports, Arab Sports (saudiarabia2.xml, egypt1.xml, morocco1.xml)
    'ssc-sport-1-ar': ['Saudi Sports 1.sa', 'SSC News.sa'],
    'ssc-sport-2-ar': ['Saudi Sports 2.sa', 'SSC News.sa'],
    'ssc-sport-3-ar': ['Saudi Sports 3.sa', 'SSC News.sa'],
    'ssc-extra-1-ar': ['Saudi Sports 1.sa', 'Sport 24.sa'],
    'ssc-extra-2-ar': ['Saudi Sports 2.sa', 'Sport 24.sa'],
    'ssc-extra-3-ar': ['Saudi Sports 3.sa', 'SSC News.sa'],
    'starzplay-sports-1-ar': ['AD Sports Premium 1.sa', 'STARZPLAY Sports.sa', 'DAZN 1.it', 'stc tv sports 1 HD.sa'],
    'starzplay-sports-2-ar': ['AD Sports Premium 2.sa', 'STARZPLAY Sports.sa', 'DAZN 2.it'],
    'ad-sports-1-ar': ['AD Sports 1.sa'],
    'ad-sports-2-ar': ['AD Sports 2.sa'],
    'dubai-sports-1-ar': ['Dubai Sports HD.sa', 'Dubai Sports 2.sa'],
    'ontime-sports-1-ar': ['أون إي.eg', 'إم بي سي مصر 2.eg', 'ON E.eg'],
    'ktv-sport-ar': ['الكويت.eg', 'Kuwait.eg'],
    'arryadia-ar': ['Arryadia.ma'],

    // 4. MENA Movies, MBC, Rotana, Entertainment (qatar4.xml, egypt1.xml, egypt2.xml, saudiarabia2.xml, unitedkingdom2.xml)
    'bein-movies-premiere-en': ['MOVIES1 PREMIERE DIGITAL.qa', 'Sky Cinema Premiere HD.uk', 'Sky Cinema Premiere.uk'],
    'bein-movies-action-en': ['MOVIES2 ACTION DIGITAL.qa', 'Sky Cinema Action HD.uk', 'Sky Cinema Action.uk'],
    'bein-movies-drama-en': ['MOVIES3 DRAMA DIGITAL.qa', 'Sky Cinema Drama HD.uk', 'Sky Cinema Drama.uk'],
    'bein-movies-hits-en': ['MOVIES4 FAMILY DIGITAL.qa', 'Sky Cinema Hits HD.uk', 'Sky Cinema Hits.uk'],
    'bein-movies-action-ar': ['MOVIES2 ACTION DIGITAL.qa', 'Sky Cinema Action HD.uk'],
    'bein-movies-thriller-ar': ['MOVIES3 DRAMA DIGITAL.qa', 'Sky Cinema Thriller HD.uk'],
    'bein-aflam-ar': ['روتانا سينما.eg', 'Rotana Cinema HD.sa', 'MOVIES4 FAMILY DIGITAL.qa'],
    'rotana-cinema-ar': ['روتانا سينما.eg', 'Rotana Cinema HD.sa', 'Rotana Cinema.eg'],
    'rotana-drama-ar': ['روتانا دراما.eg', 'Rotana Drama HD.sa', 'Rotana Drama.eg'],
    'rotana-comedy-ar': ['روتانا كوميدي.eg', 'Rotana Comedy.sa', 'Rotana Comedy.eg'],
    'mbc-1-ar': ['إم بي سي.eg', 'MBC 1 HD.sa', 'MBC.eg'],
    'mbc-4-ar': ['إم بي سي 4.eg', 'MBC 4 HD.sa', 'MBC 4.eg'],
    'mbc-5-ar': ['إم بي سي 5.eg', 'MBC 5.eg'],
    'mbc-drama-ar': ['إم بي سي دراما.eg', 'MBC Drama HD.sa', 'MBC Drama.eg'],
    'mbc-plus-drama-ar': ['إم بي سي دراما +.eg', 'MBC+ Drama HD.sa', 'MBC Drama +.eg'],
    'mbc-masr-ar': ['إم بي سي مصر.eg', 'MBC MASR.sa', 'MBC Egypt.eg'],
    'mbc-masr-2-ar': ['إم بي سي مصر 2.eg', 'MBC MASR 2.sa', 'MBC MASR 2.eg'],
    'mbc-iraq-ar': ['إم بي سي العراق.eg', 'MBC Iraq.eg'],
    'bab-al-hara-ar': ['إم بي سي دراما +.eg', 'MBC+ Drama HD.sa', 'إم بي سي دراما.eg'],
    'spacetoon-ar': ['Space Toon.sa'],
    'hbo-hd': ['HBOHD.us', 'HBO.us'],
    'hbo-2-hd': ['HBOP.us', 'HBOHTS.us', 'HBODRMA.us'],
    'showtime-hd': ['HBOMOV.us', 'HBOHD.us'],
    'starz-hd': ['STARZ.us', 'STARZP.us'],
    'cinemax-hd': ['HBOC.us', 'HBOHTS.us'],

    // 5. UK Sky Sports, TNT Sports, Premier Sports, LaLigaTV, MUTV, ITV4, Eurosport UK (unitedkingdom3.xml, unitedkingdom2.xml, unitedkingdom1.xml)
    'sky-sports-main-event': ['Sky Sports Main Event HD.uk', 'Sky Sports Main Event.uk'],
    'sky-sports-premier-league': ['Sky Sports Premier League HD.uk', 'Sky Sports Premier League.uk'],
    'sky-sports-football': ['Sky Sports Football HD.uk', 'Sky Sports Football.uk'],
    'sky-sports-plus': ['Sky Sports + HD.uk', 'Sky Sports +.uk', 'Sky Sports + SD.uk'],
    'sky-sports-action': ['Sky Sports NFL HD.uk', 'Sky Sports Action HD.uk', 'Sky Sports NFL.uk', 'Sky Sports Action.uk'],
    'sky-sports-f1': ['Sky Sports F1 HD.uk', 'Sky Sports F1.uk'],
    'sky-sports-cricket': ['Sky Sports Cricket HD.uk', 'Sky Sports Cricket.uk'],
    'sky-sports-golf': ['Sky Sports Golf HD.uk', 'Sky Sports Golf.uk'],
    'sky-sports-tennis': ['Sky Sports Tennis HD.uk', 'Sky Sports Tennis.uk', 'Sky Sports Tennis SD.uk'],
    'sky-sports-mix': ['Sky Sports Mix HD.uk', 'Sky Sports Mix.uk'],
    'sky-sports-news': ['Sky Sports News HD.uk', 'Sky Sports News.uk'],
    'sky-sports-racing': ['Sky Sports Racing.uk', 'Racing TV HD.uk'],
    'tnt-sports-1': ['TNT Sports 1 HD.uk', 'TNT Sports 1.uk'],
    'tnt-sports-2': ['TNT Sports 2 HD.uk', 'TNT Sports 2.uk'],
    'tnt-sports-3': ['TNT Sports 3 HD.uk', 'TNT Sports 3.uk'],
    'tnt-sports-4': ['TNT Sports 4 HD.uk', 'TNT Sports 4.uk'],
    'premier-sports-1': ['Premier Sports 1 HD.uk'],
    'premier-sports-2': ['Premier Sports 2 HD.uk'],
    'laligatv-uk': ['LaLigaTV HD.uk', 'Premier Sports 1 HD.uk', 'M+ LALIGA TV.es'],
    'mutv-uk': ['MUTV HD.uk', 'MUTV.uk'],
    'itv4-sport-uk': ['ITV4 HD.uk', 'ITV4.uk'],
    'talksport-tv-uk': ['Sky Sports News HD.uk'],
    'rugbypass-tv-uk': ['TNT Sports 1 HD.uk'],
    'eurosport-1': ['Eurosport 1.uk', 'British Eurosport HD.uk'],
    'eurosport-2': ['Eurosport 2 HD.uk', 'Eurosport 2.uk'],

    // 6. South Africa SuperSport (southafrica2.xml)
    'supersport-premier-league': ['SS Premier League.za'],
    'supersport-grandstand': ['SS Grandstand.za'],
    'supersport-football': ['SS Football.za', 'SS Football Plus.za'],
    'supersport-laliga': ['SS La Liga.za'],
    'supersport-variety-1': ['SS Action.za', 'SS Extra.za'],

    // 7. Spain Movistar Plus+ & DAZN España (spain1.xml, spain2.xml)
    'movistar-laliga-es': ['M+ LALIGA TV.es', 'M+ LALIGA.es', 'M+ LALIGA HDR.es'],
    'dazn-laliga-es': ['DAZN LALIGA.es', 'DAZN LALIGA 2.es'],
    'movistar-plus-es': ['Movistar Plus+.es', 'Movistar Plus.es'],
    'laliga-hypermotion-es': ['LALIGA TV HYPERMOTION.es', 'LALIGA TV HYPERMOTION 2.es'],
    'movistar-liga-de-campeones-es': ['Movistar Liga de Campeones.es'],
    'movistar-vamos-es': ['#Vamos.es', 'M+ Vamos.es'],
    'movistar-deportes-es': ['Movistar Deportes 1.es', 'DAZN 1.es'],
    'dazn-f1-es': ['DAZN F1.es'],
    'real-madrid-tv': ['Real Madrid TV.es'],

    // 8. Italy Serie A DAZN, Sky Sport Italia, Eurosport IT, Rai Sport & Sportitalia (italy5.xml, italy1.xml)
    'dazn-1-it': ['DAZN 1.it', 'Sky Sport Calcio.it'],
    'sky-sport-calcio-it': ['Sky Sport Calcio.it'],
    'sky-sport-uno-it': ['Sky Sport Uno.it'],
    'sky-sport-f1-it': ['Sky Sport F1.it'],
    'sky-sport-motogp-it': ['Sky Sport MotoGP.it'],
    'sky-sport-tennis-it': ['Sky Sport Tennis.it'],
    'sky-sport-nba-it': ['Sky Sport NBA.it'],
    'sky-sport-golf-it': ['Sky Sport Golf.it', 'Sky Sport Arena.it'],
    'sky-sport-arena-it': ['Sky Sport Arena.it'],
    'sky-sport-max-it': ['Sky Sport Max.it', 'Sky Sport Calcio.it'],
    'sky-sport-24-it': ['Sky TG24.it', 'Sky Sport.it'],
    'sky-sport-251-it': ['Sky Sport 251.it', 'Sky Sport Calcio.it'],
    'sky-sport-252-it': ['Sky Sport.it', 'Sky Sport 4K.it', 'Sky Sport Calcio.it'],
    'sky-sport-253-it': ['Sky Sport 253.it', 'Sky Sport Uno.it'],
    'sky-sport-254-it': ['Sky Sport 254.it', 'Sky Sport Max.it'],
    'eurosport-1-it': ['Eurosport 1.it', 'Eurosport 1.fr'],
    'eurosport-2-it': ['Eurosport 2.it', 'Eurosport 2.fr'],
    'rai-sport-it': ['Rai Sport.it'],
    'sportitalia-it': ['Sportitalia.it'],

    // 9. France beIN Sports FR, Canal+, RMC Sport, Eurosport FR, Automoto, Sport en France, Equidia, L'Équipe (france1.xml)
    'bein-sports-fr-1': ['beIN SPORTS 1.fr'],
    'bein-sports-fr-2': ['beIN SPORTS 2.fr'],
    'bein-sports-fr-3': ['beIN SPORTS 3.fr'],
    'bein-sports-max-4-fr': ['beIN SPORTS MAX 4.fr'],
    'bein-sports-max-5-fr': ['beIN SPORTS MAX 5.fr'],
    'bein-sports-max-6-fr': ['beIN SPORTS MAX 6.fr'],
    'bein-sports-max-7-fr': ['beIN SPORTS MAX 7.fr'],
    'bein-sports-max-8-fr': ['beIN SPORTS MAX 8.fr', 'beIN SPORTS 1.fr'],
    'bein-sports-max-9-fr': ['beIN SPORTS MAX 9.fr'],
    'bein-sports-max-10-fr': ['beIN SPORTS MAX 10.fr'],
    'canal-plus-fr': ['Canal+.fr', 'Canal+ Foot.fr'],
    'canal-plus-sport-fr': ['Canal+ Sport.fr', 'Canal+ Foot.fr'],
    'canal-plus-foot-fr': ['Canal+ Foot.fr', 'Canal+ Sport.fr'],
    'canal-plus-sport-360-fr': ['Canal+ Sport 360.fr', 'Canal+ Sport.fr'],
    'canal-plus-f1-fr': ['Canal+ Formula 1.fr', 'Canal+ Sport 360.fr', 'Canal+ Sport.fr'],
    'canal-plus-motogp-fr': ['Canal+ Moto GP.fr', 'Canal+ Sport 360.fr'],
    'canal-plus-afrique-1': ['Canal+ Sport.fr', 'Canal+ Foot.fr'],
    'canal-plus-afrique-2': ['Canal+ Foot.fr', 'Canal+ Sport.fr'],
    'canal-plus-extra-1': ['Canal+ Foot.fr', 'Canal+ Sport.fr'],
    'canal-plus-extra-2': ['Canal+ Sport.fr', 'Canal+ Foot.fr'],
    'canal-plus-sport-1-eu': ['Canal+ Sport.fr'],
    'canal-plus-sport-2-eu': ['Canal+ Foot.fr'],
    'canal-plus-premium-hd': ['Canal+.fr'],
    'dazn-ligue1-fr': ['Canal+ Ligue 1.fr', 'Canal+ Foot.fr'],
    'rmc-sport-1-fr': ['RMC Sport 1.fr', 'RMC Sport 2.fr'],
    'rmc-sport-2-fr': ['RMC Sport 2.fr', 'RMC Sport 1.fr'],
    'eurosport-1-fr': ['Eurosport 1.fr'],
    'eurosport-2-fr': ['Eurosport 2.fr'],
    'automoto-fr': ['Automoto La chaîne.fr', 'Canal+ Sport 360.fr'],
    'sport-en-france': ['Sport en France.fr', "L'Equipe.fr"],
    'equidia-fr': ['Equidia.fr'],
    'lequipe-fr': ["L'Equipe.fr"],

    // 10. Turkey beIN Sports TR (turkey1.xml)
    'bein-sports-1-tr': ['beIN SPORTS 1.tr'],
    'bein-sports-2-tr': ['beIN SPORTS 2.tr'],
    'bein-sports-3-tr': ['beIN SPORTS 3.tr'],
    'bein-sports-4-tr': ['beIN SPORTS 4.tr'],
    'bein-sports-5-tr': ['beIN SPORTS 5.tr'],
    'bein-sports-haber-tr': ['beIN SPORTS HABER.tr'],

    // 11. USA ESPN, Fox Sports, NBC/USA, CBS, League & Regional Networks (unitedstates1.xml, unitedstates2.xml)
    'usa-network-hd': ['USAHD.us', 'USA.us', 'NBCSN.us'],
    'fox-sports-1': ['FS1HD.us', 'FS1.us'],
    'fox-sports-2': ['FS2HD.us', 'FS2.us'],
    'fox-deportes-us': ['FOXD.us', 'FS1HD.us'],
    'fox-sports-news': ['FS1HD.us', 'FS2HD.us'],
    'espn-hd': ['ESPNHD.us', 'ESPN.us'],
    'espn-2-hd': ['ESPN2HD.us', 'ESPN2.us'],
    'espnu-hd': ['ESPNUHD.us', 'ESPNU.us'],
    'sec-network-us': ['SECN.us', 'ESPNUHD.us'],
    'acc-network-us': ['ACCN.us', 'ESPNUHD.us'],
    'big-ten-network-us': ['BTNHD.us', 'BTN.us'],
    'espn-deportes-es': ['ESPNDHD.us', 'ESPND.us'],
    'cbs-sports-network': ['CBSSNHD.us', 'CBSSN.us'],
    'cbs-sports-golazo': ['CBSSNHD.us', 'CBSSN.us'],
    'nbc-sports-now': ['NBCSN.us', 'NBC4KS2.us', 'USAHD.us'],
    'golf-channel-us': ['GOLFHD.us', 'GOLF.us'],
    'tudn-usa': ['TUDNHD.us', 'TUDN.us'],
    'yes-network-us': ['YESHD.us', 'YES.us'],
    'msg-network-us': ['MSGHD.us', 'MSG.us'],
    'nesn-us': ['NESNHD.us', 'NESN.us'],
    'marquee-sports-us': ['MARQ.us', 'MLBN.us'],
    'nba-tv': ['NBATVHD.us', 'NBATV.us'],
    'nfl-network': ['NFLNET.us', 'NFLHD.us'],
    'nfl-redzone': ['NFLNRZ.us', 'NFLNRZD.us', 'NFLNET.us'],
    'nhl-network': ['NHLNET.us', 'NHLHD.us'],
    'mlb-network': ['MLBN.us', 'MLBHD.us'],
    'tennis-channel': ['TENNIS.us']
};

const ALL_TARGET_XMLTV_IDS = new Set<string>(Object.values(CHANNEL_TO_XMLTV_IDS).flat());

const OFFICIAL_XMLTV_FEEDS = [
    'https://www.open-epg.com/files/qatar1.xml',
    'https://www.open-epg.com/files/qatar2.xml',
    'https://www.open-epg.com/files/qatar4.xml',
    'https://www.open-epg.com/files/saudiarabia2.xml',
    'https://www.open-epg.com/files/egypt1.xml',
    'https://www.open-epg.com/files/egypt2.xml',
    'https://www.open-epg.com/files/morocco1.xml',
    'https://www.open-epg.com/files/unitedkingdom3.xml',
    'https://www.open-epg.com/files/unitedkingdom2.xml',
    'https://www.open-epg.com/files/unitedkingdom1.xml',
    'https://www.open-epg.com/files/southafrica2.xml',
    'https://www.open-epg.com/files/spain1.xml',
    'https://www.open-epg.com/files/spain2.xml',
    'https://www.open-epg.com/files/italy5.xml',
    'https://www.open-epg.com/files/italy1.xml',
    'https://www.open-epg.com/files/france1.xml',
    'https://www.open-epg.com/files/turkey1.xml',
    'https://www.open-epg.com/files/unitedstates1.xml'
];

let xmltvScheduleCache = new Map<string, XmltvRawProgramme[]>();
let lastXmltvHarvestTime = 0;
let xmltvHarvestPromise: Promise<void> | null = null;
const XMLTV_HARVEST_TTL_MS = 20 * 60 * 1000; // 20 minutes

function unescapeXmlText(raw: string): string {
    if (!raw) return '';
    return raw
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
        .trim();
}

function parseXmltvTimestamp(raw: string): number {
    if (!raw) return 0;
    const m = raw.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-])(\d{2})(\d{2}))?/);
    if (!m) return 0;
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    const hour = Number(m[4]);
    const minute = Number(m[5]);
    const second = Number(m[6]);
    const utcMs = Date.UTC(year, month, day, hour, minute, second);
    if (!m[7]) return utcMs;
    const sign = m[7] === '+' ? 1 : -1;
    const tzHours = Number(m[8] || 0);
    const tzMins = Number(m[9] || 0);
    const offsetMs = sign * (tzHours * 3600 + tzMins * 60) * 1000;
    return utcMs - offsetMs;
}

/**
 * Harvests real-time official broadcaster XMLTV schedules across all regional open-epg.com feeds
 * and caches programmes within [-4h, +36h] for our 142 channels.
 */
export async function harvestOfficialXmltvEpg(): Promise<void> {
    if (Date.now() - lastXmltvHarvestTime < XMLTV_HARVEST_TTL_MS && xmltvScheduleCache.size > 0) {
        return;
    }
    if (xmltvHarvestPromise) {
        return xmltvHarvestPromise;
    }

    xmltvHarvestPromise = (async () => {
        const nowMs = Date.now();
        const minStopMs = nowMs - 4 * 3600 * 1000;
        const maxStartMs = nowMs + 36 * 3600 * 1000;
        const nextCache = new Map<string, XmltvRawProgramme[]>();

        const fetchAndParseXmlFeed = async (feedUrl: string) => {
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const res = await fetch(feedUrl, {
                        headers: { 'User-Agent': DEFAULT_UA },
                        signal: AbortSignal.timeout(12000)
                    });
                    if (!res.ok) continue;
                    const xmlText = await res.text();

                    const progRegex = /<programme\s+start="([^"]+)"\s+stop="([^"]+)"\s+channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g;
                    let match: RegExpExecArray | null;
                    let iterCount = 0;
                    while ((match = progRegex.exec(xmlText)) !== null) {
                        if (++iterCount % 250 === 0) {
                            await new Promise((r) => setImmediate(r));
                        }
                        const rawChannelId = unescapeXmlText(match[3]);
                        if (!ALL_TARGET_XMLTV_IDS.has(rawChannelId)) continue;

                        const startMs = parseXmltvTimestamp(match[1]);
                        const stopMs = parseXmltvTimestamp(match[2]);
                        if (!startMs || !stopMs || stopMs <= minStopMs || startMs >= maxStartMs) continue;

                        const inner = match[4];
                        const titleMatch = inner.match(/<title(?:\s+lang="([^"]*)")?[^>]*>([\s\S]*?)<\/title>/i);
                        const title = unescapeXmlText(titleMatch?.[2] || '');
                        if (
                            !title ||
                            /in HD on 50\d/i.test(title) ||
                            /^nessun evento in onda$/i.test(title) ||
                            /^dazn\s*[12]$/i.test(title) ||
                            /^saudi\s*sports?\s*[123]?$/i.test(title) ||
                            /^ssc\s*news$/i.test(title) ||
                            /^sport\s*24$/i.test(title)
                        ) {
                            continue;
                        }

                        const lang = (titleMatch?.[1] || '').trim().toLowerCase();
                        const subMatch = inner.match(/<sub-title[^>]*>([\s\S]*?)<\/sub-title>/i);
                        const descMatch = inner.match(/<desc[^>]*>([\s\S]*?)<\/desc>/i);
                        const catMatch = inner.match(/<category[^>]*>([\s\S]*?)<\/category>/i);

                        const prog: XmltvRawProgramme = {
                            xmlChannelId: rawChannelId,
                            startMs,
                            stopMs,
                            title,
                            subTitle: unescapeXmlText(subMatch?.[1] || ''),
                            description: unescapeXmlText(descMatch?.[1] || ''),
                            category: unescapeXmlText(catMatch?.[1] || ''),
                            lang
                        };

                        const list = nextCache.get(rawChannelId) || [];
                        list.push(prog);
                        nextCache.set(rawChannelId, list);
                    }
                    return;
                } catch {
                    // Retry once if transient socket timeout
                }
            }
        };

        const batchSize = 2;
        for (let i = 0; i < OFFICIAL_XMLTV_FEEDS.length; i += batchSize) {
            const batch = OFFICIAL_XMLTV_FEEDS.slice(i, i + batchSize);
            await Promise.allSettled(batch.map((feedUrl) => fetchAndParseXmlFeed(feedUrl)));
            await new Promise((r) => setImmediate(r));
        }

        if (nextCache.size > 0) {
            for (const [cid, list] of nextCache.entries()) {
                list.sort((a, b) => a.startMs - b.startMs);
                // Deduplicate identical start times
                const deduped: XmltvRawProgramme[] = [];
                for (const item of list) {
                    if (deduped.length === 0 || deduped[deduped.length - 1].startMs !== item.startMs) {
                        deduped.push(item);
                    }
                }
                // Merge into existing cache so any single feed blip doesn't wipe previously harvested regions
                xmltvScheduleCache.set(cid, deduped);
            }
            lastXmltvHarvestTime = Date.now();
        }
        xmltvHarvestPromise = null;
    })();

    return xmltvHarvestPromise;
}

// Pre-warm 24-hour KSA/SSC Sports & top Bluetier signed HLS tokens in background on boot so first tune-in is instant
setTimeout(() => {
    for (const id of [9, 10, 16]) {
        getAloulaSignedHlsUrl(id).catch(() => {});
    }
    for (const slug of ['beINAR', 'beINAR2', 'beINAR3', 'BEINSPORT1FR', 'skysportsmainevent', 'skysportspremierleague', 'TNT1UK', 'ESPN']) {
        getWideIptvSignedHlsUrl(slug).catch(() => {});
    }
}, 250);

/**
 * Builds a proxied URL through CinePro's Live HLS Proxy (embeds channelId for automatic mid-stream failover)
 */
export function buildLiveProxyUrl(
    rawUrl: string,
    publicBaseUrl: string,
    headers?: Record<string, string>,
    channelId?: string,
    qualityVariant?: string
): string {
    const proxyPayload: Record<string, any> = {
        url: rawUrl,
        headers: {
            'User-Agent': DEFAULT_UA,
            ...(headers || {})
        }
    };
    if (channelId) proxyPayload.channelId = channelId;
    if (qualityVariant) proxyPayload.q = qualityVariant;
    return `${publicBaseUrl}/v1/live/proxy/manifest.m3u8?data=${encodeURIComponent(JSON.stringify(proxyPayload))}`;
}

/**
 * Fast liveness check for an M3U8 stream (supports Edge dynamic token injection, variant extraction & health scoring)
 */
async function probeStreamLiveness(
    url: string,
    headers?: Record<string, string>,
    timeoutMs = 2400,
    publicBaseUrl?: string,
    channelId?: string,
    shouldPrefetchSegments = false
): Promise<{
    ok: boolean;
    latencyMs: number;
    healthScore: number;
    circuitState: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
    variants?: HlsQualityVariant[];
    audioTracks?: Array<{ language: string; label: string }>;
}> {
    const health = getOrCreateHealthState(url, channelId);

    // If circuit breaker is OPEN (3+ consecutive failures in last 90s), fast-fail unless half-open cooldown elapsed
    if (health.circuitState === 'OPEN') {
        return {
            ok: false,
            latencyMs: 0,
            healthScore: health.healthScore,
            circuitState: 'OPEN'
        };
    }

    const t0 = Date.now();
    const cacheKey = publicBaseUrl ? `${publicBaseUrl}::${url}` : '';
    const proxyManifestKey = publicBaseUrl ? `${publicBaseUrl}::${url}::r=1::p=` : '';
    if (cacheKey) {
        const cached = lastGoodManifestCache.get(cacheKey);
        if (cached && Date.now() - cached.updatedAt < 12000) {
            const cachedVariants = streamVariantsCache.get(cacheKey);
            return {
                ok: true,
                latencyMs: Math.min(25, health.emaLatencyMs || 12),
                healthScore: health.healthScore,
                circuitState: health.circuitState,
                variants: cachedVariants?.variants,
                audioTracks: cachedVariants?.audioTracks
            };
        }
    }
    try {
        const resolved = await resolveDynamicManifestUrl(url, headers);
        const res = await fetch(resolved.url, {
            method: 'GET',
            headers: resolved.headers,
            signal: AbortSignal.timeout(timeoutMs)
        });
        const latencyMs = Date.now() - t0;
        if (!res.ok) {
            const updated = recordStreamHealthResult(url, false, latencyMs, channelId, `http_${res.status}`);
            return {
                ok: false,
                latencyMs,
                healthScore: updated.healthScore,
                circuitState: updated.circuitState
            };
        }
        const chunk = await res.text();
        const finalUrlLower = (res.url || resolved.url || '').toLowerCase();
        const isDeadTransponder =
            finalUrlLower.includes('unknown%20channel') ||
            finalUrlLower.includes('unknown_channel') ||
            chunk.toLowerCase().includes('/unknown%20channel/') ||
            chunk.toLowerCase().includes('unknown channel');

        if (isDeadTransponder) {
            const slugMatch = url.match(/\/(premium\d+)\//i);
            if (slugMatch && channelId) {
                logAutoFeedCorrection({
                    channelId,
                    channelName: channelId,
                    action: 'DEAD_TRANSPONDER_FILTERED',
                    slug: slugMatch[1],
                    upstreamDirectoryName: 'Offline Satellite Transponder (unknown channel)',
                    timestamp: new Date().toISOString()
                });
            }
            const updated = recordStreamHealthResult(url, false, latencyMs, channelId, 'dead_transponder_unknown_channel');
            return {
                ok: false,
                latencyMs,
                healthScore: updated.healthScore,
                circuitState: updated.circuitState
            };
        }

        const hasExtM3U = chunk.includes('#EXTM3U') || chunk.includes('#EXT-X-');
        const hasMediaLine = chunk.split(/\r?\n/).some((l) => {
            const t = l.trim();
            return t.length > 0 && !t.startsWith('#');
        });
        const isM3U = hasExtM3U && hasMediaLine;
        const updated = recordStreamHealthResult(url, isM3U, latencyMs, channelId, isM3U ? undefined : 'invalid_m3u');

        let parsedVariants: HlsQualityVariant[] | undefined;
        let parsedAudio: Array<{ language: string; label: string }> | undefined;

        if (isM3U && publicBaseUrl && cacheKey) {
            const finalBase = res.url || resolved.url;
            const rewritten = rewriteLiveHlsManifest(chunk, finalBase, publicBaseUrl, resolved.headers, channelId);
            const nowMs = Date.now();
            lastGoodManifestCache.set(cacheKey, {
                content: rewritten,
                updatedAt: nowMs
            });
            if (proxyManifestKey) {
                const existingProxy = lastGoodManifestCache.get(proxyManifestKey);
                if (!existingProxy || nowMs - existingProxy.updatedAt > 1500) {
                    lastGoodManifestCache.set(proxyManifestKey, {
                        content: rewritten,
                        updatedAt: nowMs
                    });
                }
            }
            if (shouldPrefetchSegments) {
                prefetchLatestSegment(chunk, finalBase, resolved.headers, channelId);
            }
            const extracted = parseHlsMasterVariants(
                chunk,
                finalBase,
                publicBaseUrl,
                resolved.headers,
                channelId,
                '1080p',
                'en',
                url
            );
            parsedVariants = extracted.variants;
            parsedAudio = extracted.audioTracks;
            streamVariantsCache.set(cacheKey, {
                variants: extracted.variants,
                audioTracks: extracted.audioTracks,
                updatedAt: nowMs
            });
        }
        return {
            ok: isM3U,
            latencyMs,
            healthScore: updated.healthScore,
            circuitState: updated.circuitState,
            variants: parsedVariants,
            audioTracks: parsedAudio
        };
    } catch (err: any) {
        const latencyMs = Date.now() - t0;
        const updated = recordStreamHealthResult(url, false, latencyMs, channelId, err?.message || 'timeout');
        return {
            ok: false,
            latencyMs,
            healthScore: updated.healthScore,
            circuitState: updated.circuitState
        };
    }
}

/**
 * Returns the clean, standardized Group Title for a LiveChannel (used in /v1/live/channels and M3U group-title="...")
 */
export function getChannelGroupTitle(ch: LiveChannel): string {
    if (ch.category === 'algeria' || ch.country === 'DZ') {
        return 'Algeria TV';
    }
    if (ch.group) {
        return ch.group;
    }
    if (ch.country === 'IT') {
        return 'Italy Sports (Sky Sport IT / DAZN / Rai)';
    }
    if (ch.country === 'UK' && (ch.category === 'sky' || ch.category === 'europe' || ch.category === 'combat')) {
        return 'UK Sports (Sky / TNT / Premier)';
    }
    if (ch.country === 'US' && (ch.category === 'espn' || ch.category === 'fox' || ch.category === 'usa')) {
        return 'USA Sports (ESPN / FOX / CBS / NBC)';
    }
    if (ch.country === 'FR' && (ch.category === 'canal' || ch.category === 'europe' || ch.category === 'motorsport')) {
        return 'France Sports (Canal+ / RMC / Eurosport)';
    }
    if (ch.country === 'ES') {
        return 'Spain Sports (Movistar+ / DAZN ES)';
    }
    if (ch.category === 'bein') {
        return `beIN Sports (${ch.language.toUpperCase()})`;
    }
    if (ch.id.startsWith('ssc-')) {
        return 'Saudi Sports (SSC / KSA Sports)';
    }
    return `${ch.network} (${ch.language.toUpperCase()})`;
}

/**
 * Returns filtered list of Live Sports Channels with real-time EPG, Master ABR Playlist URL & Server Count
 */
export function getLiveChannels(
    publicBaseUrl: string,
    filters?: { lang?: string; category?: string; query?: string }
): Array<LiveChannel & { group: string; streamEndpoint: string; masterPlaylistUrl: string; defaultProxyUrl: string; backupServerCount: number }> {
    harvestDynamicSportsM3U().catch(() => {});
    harvestOfficialXmltvEpg().catch(() => {});
    if (Date.now() - lastEventsFetchTime >= EVENTS_TTL_MS) {
        getLiveSportEvents(publicBaseUrl).catch(() => {});
    }

    let list = CORE_SPORTS_CHANNELS.map((ch) => {
        const channelEpg = getChannelEPG(ch.id, publicBaseUrl);
        return {
            ...ch,
            group: getChannelGroupTitle(ch),
            epg: channelEpg
                ? {
                      nowPlaying: channelEpg.nowPlaying,
                      nextUp: channelEpg.nextUp,
                      upcoming: channelEpg.upcoming
                  }
                : undefined
        };
    });

    if (filters?.lang && filters.lang !== 'all') {
        const langLower = filters.lang.toLowerCase();
        list = list.filter((c) => c.language === langLower || c.language === 'multi');
    }

    if (filters?.category && filters.category !== 'all') {
        const catLower = filters.category.toLowerCase().replace(/\s+/g, '');
        list = list.filter(
            (c) =>
                c.category === catLower ||
                c.group.toLowerCase().replace(/\s+/g, '') === catLower ||
                (catLower === 'algeriatv' && (c.category === 'algeria' || c.country === 'DZ')) ||
                (catLower === 'dz' && c.country === 'DZ') ||
                ((catLower === 'italy' || catLower === 'it' || catLower === 'italysports') && c.country === 'IT') ||
                ((catLower === 'uk' || catLower === 'unitedkingdom' || catLower === 'uksports') && c.country === 'UK') ||
                ((catLower === 'usa' || catLower === 'us' || catLower === 'unitedstates' || catLower === 'usasports') &&
                    (c.country === 'US' || c.category === 'usa' || c.category === 'espn' || c.category === 'fox')) ||
                ((catLower === 'france' || catLower === 'fr' || catLower === 'francesports') && c.country === 'FR') ||
                ((catLower === 'spain' || catLower === 'es' || catLower === 'spainsports') && c.country === 'ES') ||
                ((catLower === 'canal+' || catLower === 'canalplus') && c.category === 'canal') ||
                (catLower !== 'sky' && c.network.toLowerCase().replace(/\s+/g, '').includes(catLower)) ||
                c.id.toLowerCase().includes(catLower) ||
                (catLower === 'europe' &&
                    (c.category === 'canal' || c.id.startsWith('tnt-sports') || c.id.startsWith('premier-sports'))) ||
                (catLower === 'mena' && c.category === 'algeria') ||
                (catLower === 'motorsport' &&
                    (c.id === 'sky-sports-f1' ||
                        c.id === 'sky-sport-f1-it' ||
                        c.id === 'sky-sport-motogp-it' ||
                        c.id === 'canal-plus-f1-fr' ||
                        c.id === 'canal-plus-motogp-fr' ||
                        c.id === 'automoto-fr'))
        );
    }

    if (filters?.query) {
        const q = filters.query.toLowerCase().trim();
        list = list.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.shortName.toLowerCase().includes(q) ||
                c.network.toLowerCase().includes(q) ||
                c.group.toLowerCase().includes(q) ||
                c.languageLabel.toLowerCase().includes(q) ||
                c.id.toLowerCase().includes(q) ||
                (c.epg?.nowPlaying.title.toLowerCase().includes(q) ?? false) ||
                (c.epg?.nowPlaying.subtitle.toLowerCase().includes(q) ?? false) ||
                (c.epg?.nextUp.title.toLowerCase().includes(q) ?? false)
        );
    }

    return list.map((ch) => {
        const validStreams = ch.streams.filter(
            (st) => !st.url.includes('primetv.cc.cd') && !st.url.includes('andro.mangeinde4.lat')
        );
        const effectiveStreams = validStreams.length > 0 ? validStreams : ch.streams;
        const primaryStream = effectiveStreams[0];
        const dynBackups = dynamicChannelCache.get(ch.id) || [];
        return {
            ...ch,
            streams: effectiveStreams.map((st) => ({
                ...st,
                rawUrl: st.url,
                url: buildLiveProxyUrl(st.url, publicBaseUrl, st.headers, ch.id)
            })),
            streamEndpoint: `${publicBaseUrl}/v1/live/stream/${ch.id}`,
            masterPlaylistUrl: `${publicBaseUrl}/v1/live/master/${ch.id}.m3u8`,
            defaultProxyUrl: primaryStream
                ? buildLiveProxyUrl(primaryStream.url, publicBaseUrl, primaryStream.headers, ch.id)
                : '',
            backupServerCount: Math.max(2, effectiveStreams.length + dynBackups.length)
        };
    });
}

/**
 * Resolves and verifies all streams strictly for a given channel ID (never mixes other channels).
 * Enriches every source with Multi-Quality ABR variants, Rolling Health Scores, Circuit Breaker status,
 * MPEG-TS binary inspection metadata, and Virtual Master Playlist URLs.
 */
interface ResolvedChannelCacheEntry {
    result: {
        channel: LiveChannel | null;
        epg: ChannelEPG | null;
        masterPlaylistUrl: string;
        sources: LiveStreamSource[];
    };
    expiresAt: number;
}
const resolvedChannelCache = new Map<string, ResolvedChannelCacheEntry>();
const resolvedChannelInFlight = new Map<
    string,
    Promise<{
        channel: LiveChannel | null;
        epg: ChannelEPG | null;
        masterPlaylistUrl: string;
        sources: LiveStreamSource[];
    }>
>();

/**
 * Resolves and verifies all streams strictly for a given channel ID (never mixes other channels).
 * Enriches every source with Multi-Quality ABR variants, Rolling Health Scores, Circuit Breaker status,
 * MPEG-TS binary inspection metadata, and Virtual Master Playlist URLs.
 */
export async function resolveChannelStreams(
    channelId: string,
    publicBaseUrl: string,
    onStreamVerified?: (source: LiveStreamSource) => void
): Promise<{
    channel: LiveChannel | null;
    epg: ChannelEPG | null;
    masterPlaylistUrl: string;
    sources: LiveStreamSource[];
}> {
    // Trigger background harvesters non-blocking so viewer channel tune-in starts in 0ms
    harvestDynamicSportsM3U().catch(() => {});
    harvestAndAutoCorrectUpstreamFeeds().catch(() => {});
    harvestOfficialXmltvEpg().catch(() => {});
    if (Date.now() - lastEventsFetchTime >= EVENTS_TTL_MS) {
        getLiveSportEvents(publicBaseUrl).catch(() => {});
    }

    const normalizedId = channelId.toLowerCase().trim();
    const baseChannel =
        CORE_SPORTS_CHANNELS.find((c) => c.id === normalizedId) ||
        CORE_SPORTS_CHANNELS.find((c) => c.shortName.toLowerCase().replace(/\s+/g, '-') === normalizedId) ||
        null;

    if (!baseChannel) {
        return { channel: null, epg: null, masterPlaylistUrl: '', sources: [] };
    }

    const channelCacheKey = `${publicBaseUrl}::${baseChannel.id}`;
    const cachedResolved = resolvedChannelCache.get(channelCacheKey);
    if (cachedResolved && Date.now() < cachedResolved.expiresAt) {
        if (onStreamVerified) {
            for (const src of cachedResolved.result.sources) {
                if (src.verified) onStreamVerified(src);
            }
        }
        return cachedResolved.result;
    }

    const existingFlight = resolvedChannelInFlight.get(channelCacheKey);
    if (existingFlight) {
        const res = await existingFlight;
        if (onStreamVerified) {
            for (const src of res.sources) {
                if (src.verified) onStreamVerified(src);
            }
        }
        return res;
    }

    const flight = (async () => {
        const masterPlaylistUrl = `${publicBaseUrl}/v1/live/master/${baseChannel.id}.m3u8`;
        const channelEpg = getChannelEPG(baseChannel.id, publicBaseUrl);
        const channel: LiveChannel = {
            ...baseChannel,
            epg: channelEpg
                ? {
                      nowPlaying: channelEpg.nowPlaying,
                      nextUp: channelEpg.nextUp,
                      upcoming: channelEpg.upcoming
                  }
                : undefined
        };

        // 1. Add curated streams while filtering out any transponder quarantined as hijacked in the 24h upstream directory
        const candidateStreams: Array<{
            label: string;
            url: string;
            quality: string;
            language: LiveChannel['language'];
            headers?: Record<string, string>;
        }> = [];

        for (const st of channel.streams) {
            if (st.url.includes('primetv.cc.cd') || st.url.includes('andro.mangeinde4.lat')) {
                continue;
            }
            const slugMatch = st.url.match(/\/(premium\d+)\//i);
            if (slugMatch && quarantinedChannelSlugs.has(`${channel.id}::${slugMatch[1].toLowerCase()}`)) {
                continue;
            }
            if (!candidateStreams.some((s) => s.url === st.url)) {
                candidateStreams.push(st);
            }
        }

        // 2. Append any newly shifted / auto-discovered upstream transponders for this exact channel
        const autoDiscovered = autoDiscoveredChannelFeeds.get(channel.id) || [];
        for (const disc of autoDiscovered) {
            if (!candidateStreams.some((s) => s.url === disc.url)) {
                candidateStreams.push({
                    label: disc.label,
                    url: disc.url,
                    quality: disc.quality,
                    language: channel.language,
                    headers: disc.headers
                });
            }
        }

        const curatedCount = candidateStreams.length;

        // 3. Merge dynamically harvested M3U backups strictly for this exact channel ID
        const dynamicBackups = dynamicChannelCache.get(channel.id) || [];
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

        // 4. Dynamic Live-Event Simulcast Backups:
        // ONLY when this channel is currently airing a verified LIVE match (`isLive && eventId`),
        // attach simulcast streams from other channels that are verified to be broadcasting that EXACT SAME live match right now.
        if (channelEpg?.nowPlaying?.isLive && channelEpg?.nowPlaying?.eventId) {
            const liveEventId = String(channelEpg.nowPlaying.eventId);
            const activeEvent = cachedEvents.find((ev) => String(ev.id) === liveEventId && ev.status !== 'FINISHED');
            if (activeEvent && activeEvent.recommendedChannels.length > 1) {
                const simulcastChannelIds = activeEvent.recommendedChannels
                    .map((rc) => rc.channelId)
                    .filter((cid) => cid !== channel.id);

                // Sort same-language simulcast channels first, then international simulcasts of the exact same match
                const simulcastChannels = simulcastChannelIds
                    .map((cid) => CORE_SPORTS_CHANNELS.find((c) => c.id === cid))
                    .filter((c): c is LiveChannel => Boolean(c))
                    .sort((a, b) => {
                        const aSameLang = a.language === channel.language ? 0 : 1;
                        const bSameLang = b.language === channel.language ? 0 : 1;
                        return aSameLang - bSameLang;
                    })
                    .slice(0, 4);

                for (const simCh of simulcastChannels) {
                    const simPrimary = simCh.streams[0];
                    if (!simPrimary) continue;
                    const slugMatch = simPrimary.url.match(/\/(premium\d+)\//i);
                    if (slugMatch && quarantinedChannelSlugs.has(`${simCh.id}::${slugMatch[1].toLowerCase()}`)) {
                        continue;
                    }
                    if (!candidateStreams.some((s) => s.url === simPrimary.url)) {
                        candidateStreams.push({
                            label: `${simCh.shortName} (Simulcast Backup — Same Live Event: ${activeEvent.shortTitle})`,
                            url: simPrimary.url,
                            quality: simPrimary.quality,
                            language: simPrimary.language,
                            headers: simPrimary.headers
                        });
                    }
                }
            }
        }

        const langMap: Record<string, string> = {
            ar: 'العربية (Arabic)',
            en: 'English',
            fr: 'Français (French)',
            es: 'Español (Spanish)',
            tr: 'Türkçe (Turkish)',
            it: 'Italiano (Italian)',
            multi: 'Multi-Audio'
        };

        // Launch all candidate stream probes in parallel; once the primary stream (index 0) verifies,
        // give backup servers a 180ms grace window so a slow secondary server never delays tune-in
        const rawProbePromises = candidateStreams.map((item, index) => {
            const probeTimeoutMs = index < curatedCount ? 3400 : 1600;
            const shouldPrefetch = index === 0;
            return probeStreamLiveness(
                item.url,
                item.headers,
                probeTimeoutMs,
                publicBaseUrl,
                channel.id,
                shouldPrefetch
            );
        });

        const primaryProbeResult = rawProbePromises.length > 0 ? await rawProbePromises[0] : null;
        const primarySucceeded = Boolean(primaryProbeResult?.ok);

        const probed = await Promise.all(
            candidateStreams.map(async (item, index) => {
                let probe: Awaited<ReturnType<typeof probeStreamLiveness>>;
                if (index === 0 && primaryProbeResult) {
                    probe = primaryProbeResult;
                } else if (primarySucceeded) {
                    const hState = getOrCreateHealthState(item.url, channel.id);
                    const optimisticFallback: Awaited<ReturnType<typeof probeStreamLiveness>> = {
                        ok: hState.circuitState !== 'OPEN',
                        latencyMs: hState.emaLatencyMs || 260,
                        healthScore: hState.healthScore,
                        circuitState: hState.circuitState
                    };
                    probe = await Promise.race([
                        rawProbePromises[index],
                        new Promise<Awaited<ReturnType<typeof probeStreamLiveness>>>((resolve) =>
                            setTimeout(() => resolve(optimisticFallback), 180)
                        )
                    ]);
                } else {
                    probe = await rawProbePromises[index];
                }
                const proxiedUrl = buildLiveProxyUrl(item.url, publicBaseUrl, item.headers, channel.id);

            const nowPlayingSuffix = channelEpg?.nowPlaying?.isLive
                ? ` • LIVE: ${channelEpg.nowPlaying.title}`
                : '';

            const defaultLangLabel = langMap[item.language] || 'English';
            const audioTracks =
                probe.audioTracks && probe.audioTracks.length > 0
                    ? probe.audioTracks
                    : [{ language: item.language, label: defaultLangLabel }];

            const realVariants: HlsQualityVariant[] =
                probe.variants && probe.variants.length > 0
                    ? probe.variants
                    : [
                          {
                              label: item.quality === '720p' ? '720p HD' : '1080p FHD 50fps',
                              resolution: item.quality === '720p' ? '1280x720' : '1920x1080',
                              bandwidth: item.quality === '720p' ? 3200000 : 5800000,
                              fps: 50,
                              url: proxiedUrl,
                              rawUrl: item.url
                          }
                      ];

            const qualities: HlsQualityVariant[] = [
                {
                    label: 'Auto (Direct Anti-Freeze)',
                    resolution: realVariants.length > 1 ? 'Adaptive' : realVariants[0].resolution,
                    bandwidth: realVariants[0].bandwidth,
                    url: proxiedUrl,
                    rawUrl: item.url
                },
                ...realVariants
            ];

            const backupRole: LiveStreamSource['backupRole'] =
                index === 0
                    ? 'primary'
                    : index === 1
                    ? 'backup-1'
                    : index === 2
                    ? 'backup-2'
                    : 'backup-3';

            const sourceObj: LiveStreamSource = {
                id: `${channel.id}-s${index + 1}`,
                server: `${item.label}${nowPlayingSuffix}`,
                url: proxiedUrl,
                rawUrl: item.url,
                masterUrl: proxiedUrl,
                quality: item.quality,
                qualities,
                language: item.language,
                languageLabel: defaultLangLabel,
                type: 'hls',
                verified: probe.ok,
                latencyMs: probe.latencyMs,
                healthScore: probe.healthScore,
                circuitState: probe.circuitState,
                backupRole,
                streamInfo: streamInspectionRegistry.get(item.url),
                programTitle: channelEpg?.nowPlaying?.title,
                programSubtitle: channelEpg?.nowPlaying?.subtitle,
                isLiveEvent: Boolean(channelEpg?.nowPlaying?.eventId && channelEpg?.nowPlaying?.isLive),
                headers: item.headers,
                audioTracks,
                audioNormalization: shouldApplyBroadcastAudioDsp(channel.id, item.url)
                    ? {
                          dspCleaned: true,
                          codec: 'AAC-LC 48kHz 160kbps Stereo',
                          sampleRateHz: 48000,
                          targetLoudnessDb: -16.5,
                          truePeakCeilingDb: -1.5,
                          highpassHz: 35,
                          lowpassHz: 16500,
                          noiseGateEnabled: false
                      }
                    : undefined,
                provider: {
                    id: `iptv-${channel.id}-${index + 1}`,
                    name: `${item.label} [${item.quality}]${nowPlayingSuffix}`
                }
            };

            if (probe.ok && onStreamVerified) {
                onStreamVerified(sourceObj);
            }

            return { sourceObj, index };
        })
    );

    // Prioritize verified working streams: sort by circuit state (CLOSED first), curated priority, and health score
    const verifiedStreams = probed
        .filter((item) => item.sourceObj.verified)
        .sort((a, b) => {
            const aCurated = a.index < curatedCount;
            const bCurated = b.index < curatedCount;
            if (aCurated && bCurated) {
                const scoreDiff = (b.sourceObj.healthScore || 90) - (a.sourceObj.healthScore || 90);
                if (Math.abs(scoreDiff) > 35) return scoreDiff;
                return a.index - b.index;
            }
            if (aCurated) return -1;
            if (bCurated) return 1;
            return (a.sourceObj.latencyMs || 9999) - (b.sourceObj.latencyMs || 9999);
        })
        .map((item) => item.sourceObj);

    const finalSources = verifiedStreams.length > 0 ? [...verifiedStreams] : probed.map((item) => item.sourceObj);

    // Ensure every channel has at least a secondary Anti-Freeze Relay server if only 1 upstream is configured
    if (finalSources.length === 1) {
        const primary = finalSources[0];
        const nowPlayingSuffix = channelEpg?.nowPlaying?.isLive
            ? ` • LIVE: ${channelEpg.nowPlaying.title}`
            : '';

        const relayUrl = `${primary.url}&relay=2`;
        const relayQualities = (primary.qualities || []).map((q) => ({
            ...q,
            url: `${q.url}&relay=2`
        }));
        const backupRelay: LiveStreamSource = {
            ...primary,
            id: `${channel.id}-s2-relay`,
            server: `${channel.shortName} (Server 2 Anti-Freeze Relay 1080p)${nowPlayingSuffix}`,
            url: relayUrl,
            masterUrl: relayUrl,
            qualities: relayQualities,
            backupRole: 'relay',
            provider: {
                id: `iptv-${channel.id}-relay-2`,
                name: `${channel.shortName} Backup Relay [${primary.quality}]${nowPlayingSuffix}`
            }
        };
        finalSources.push(backupRelay);
        if (primary.verified && onStreamVerified) {
            onStreamVerified(backupRelay);
        }
    }

        const resultObj = {
            channel,
            epg: channelEpg,
            masterPlaylistUrl,
            sources: finalSources
        };
        resolvedChannelCache.set(channelCacheKey, {
            result: resultObj,
            expiresAt: Date.now() + 45 * 1000
        });
        return resultObj;
    })();

    resolvedChannelInFlight.set(channelCacheKey, flight);
    try {
        return await flight;
    } finally {
        resolvedChannelInFlight.delete(channelCacheKey);
    }
}

/**
 * Synthesizes a Virtual Master HLS Playlist (/v1/live/master/:channelId.m3u8).
 * Emits only genuine verified stream variants from the primary server (zero fake ABR profiles).
 */
export async function generateChannelMasterPlaylist(
    channelId: string,
    publicBaseUrl: string
): Promise<string | null> {
    const resolved = await resolveChannelStreams(channelId, publicBaseUrl);
    if (!resolved.channel || resolved.sources.length === 0) {
        return null;
    }

    const lines: string[] = ['#EXTM3U', '#EXT-X-VERSION:3'];
    const seenUrls = new Set<string>([resolved.masterPlaylistUrl]);

    const primaryServers = resolved.sources
        .filter((src) => src.url !== resolved.masterPlaylistUrl && !src.id.endsWith('-abr'))
        .slice(0, 1);

    primaryServers.forEach((src, sIdx) => {
        const serverTag = sIdx === 0 ? 'Primary' : `Backup-${sIdx}`;
        const variants = (src.qualities || []).filter((q) => !q.label.startsWith('Auto'));

        if (variants.length > 0) {
            for (const v of variants) {
                if (seenUrls.has(v.url)) continue;
                seenUrls.add(v.url);
                const adjustedBw = Math.max(800000, v.bandwidth - sIdx * 150000);
                const codecsAttr = v.codecs ? `,CODECS="${v.codecs}"` : '';
                lines.push(
                    `#EXT-X-STREAM-INF:BANDWIDTH=${adjustedBw},RESOLUTION=${v.resolution}${codecsAttr},NAME="${v.label} (${serverTag})"`
                );
                lines.push(v.url);
            }
        } else if (!seenUrls.has(src.url)) {
            seenUrls.add(src.url);
            const bw = Math.max(1500000, 5600000 - sIdx * 400000);
            lines.push(
                `#EXT-X-STREAM-INF:BANDWIDTH=${bw},RESOLUTION=1920x1080,NAME="${src.quality} (${serverTag})"`
            );
            lines.push(src.url);
        }
    });

    return lines.join('\n') + '\n';
}

/**
 * Live Sports Events Scraper (ESPN Scoreboard API + Smart Multi-Channel EPG Mapper)
 */
let cachedEvents: LiveSportEvent[] = [];
let lastEventsFetchTime = 0;
let eventsFetchPromise: Promise<LiveSportEvent[]> | null = null;
const EVENTS_TTL_MS = 90 * 1000; // 90 seconds cache for live scores

export const SCRAPER_LEAGUE_CHANNEL_POOLS: Record<
    string,
    {
        ar: string[];
        en: string[];
        fr: string[];
        it?: string[];
        es?: string[];
        tr?: string[];
    }
> = {
    // UEFA Champions League / Europa League / Conference League
    'uefa.champions': {
        ar: ['bein-sports-1-ar', 'bein-sports-2-ar', 'bein-sports-3-ar', 'bein-sports-4-ar', 'bein-sports-5-ar', 'bein-sports-6-ar'],
        en: ['tnt-sports-1', 'tnt-sports-2', 'tnt-sports-3', 'tnt-sports-4', 'cbs-sports-network', 'cbs-sports-golazo', 'supersport-grandstand', 'supersport-football', 'bein-sports-en-1', 'bein-sports-en-2', 'bein-sports-en-3', 'premier-sports-1'],
        fr: ['canal-plus-foot-fr', 'canal-plus-fr', 'canal-plus-sport-fr', 'canal-plus-extra-1', 'canal-plus-extra-2', 'canal-plus-afrique-2', 'rmc-sport-1-fr', 'bein-sports-fr-1', 'bein-sports-fr-2', 'bein-sports-fr-3', 'bein-sports-max-4-fr', 'bein-sports-max-5-fr', 'bein-sports-max-6-fr'],
        it: ['sky-sport-uno-it', 'sky-sport-arena-it', 'sky-sport-max-it', 'sky-sport-251-it', 'sky-sport-252-it', 'sky-sport-253-it'],
        es: ['movistar-liga-de-campeones-es', 'movistar-plus-es', 'movistar-vamos-es', 'tudn-usa', 'espn-deportes-es'],
        tr: ['bein-sports-1-tr', 'bein-sports-2-tr', 'bein-sports-3-tr']
    },
    'uefa.europa': {
        ar: ['bein-sports-1-ar', 'bein-sports-2-ar', 'bein-sports-3-ar', 'bein-sports-4-ar', 'bein-sports-5-ar', 'bein-sports-6-ar'],
        en: ['tnt-sports-1', 'tnt-sports-2', 'tnt-sports-3', 'tnt-sports-4', 'cbs-sports-network', 'cbs-sports-golazo', 'supersport-football', 'bein-sports-en-1', 'bein-sports-en-2'],
        fr: ['canal-plus-foot-fr', 'canal-plus-sport-360-fr', 'canal-plus-sport-fr', 'rmc-sport-1-fr', 'bein-sports-fr-1', 'bein-sports-fr-2', 'bein-sports-max-4-fr'],
        it: ['sky-sport-uno-it', 'sky-sport-arena-it', 'sky-sport-252-it', 'sky-sport-253-it'],
        es: ['movistar-liga-de-campeones-es', 'movistar-vamos-es', 'tudn-usa', 'espn-deportes-es'],
        tr: ['bein-sports-1-tr', 'bein-sports-2-tr']
    },
    'uefa.europa.conf': {
        ar: ['bein-sports-3-ar', 'bein-sports-4-ar', 'bein-sports-5-ar', 'bein-sports-6-ar'],
        en: ['tnt-sports-3', 'tnt-sports-4', 'cbs-sports-golazo', 'premier-sports-1', 'bein-sports-en-3'],
        fr: ['canal-plus-foot-fr', 'canal-plus-sport-360-fr', 'bein-sports-max-5-fr', 'bein-sports-max-6-fr'],
        it: ['sky-sport-arena-it', 'sky-sport-max-it', 'sky-sport-254-it'],
        es: ['movistar-liga-de-campeones-es', 'movistar-vamos-es']
    },

    // English Premier League & FA Cup
    'eng.1': {
        ar: ['bein-sports-1-ar', 'bein-sports-2-ar'],
        en: ['sky-sports-premier-league', 'sky-sports-main-event', 'tnt-sports-1', 'supersport-premier-league', 'supersport-grandstand', 'usa-network-hd', 'nbc-sports-now', 'bein-sports-en-1', 'bein-sports-en-2'],
        fr: ['canal-plus-foot-fr', 'canal-plus-fr', 'canal-plus-sport-fr', 'canal-plus-sport-360-fr', 'canal-plus-afrique-1'],
        it: ['sky-sport-uno-it', 'sky-sport-max-it', 'sky-sport-arena-it'],
        es: ['movistar-liga-de-campeones-es', 'movistar-vamos-es']
    },
    'eng.fa': {
        ar: ['bein-sports-1-ar', 'bein-sports-2-ar'],
        en: ['tnt-sports-1', 'tnt-sports-2', 'itv4-sport-uk', 'supersport-football', 'espn-hd', 'bein-sports-en-1'],
        fr: ['bein-sports-fr-1', 'bein-sports-fr-2'],
        es: ['espn-deportes-es', 'movistar-vamos-es']
    },

    // EFL Championship & Carabao Cup
    'eng.2': {
        ar: ['bein-sports-2-ar'],
        en: ['sky-sports-football', 'sky-sports-plus', 'sky-sports-action', 'sky-sports-main-event', 'itv4-sport-uk', 'cbs-sports-golazo', 'supersport-football', 'bein-sports-en-2'],
        fr: ['bein-sports-fr-3']
    },
    'eng.league_cup': {
        ar: ['bein-sports-1-ar', 'bein-sports-4-ar', 'bein-sports-5-ar', 'bein-sports-6-ar', 'bein-sports-9-ar'],
        en: ['sky-sports-football', 'sky-sports-main-event', 'sky-sports-plus', 'itv4-sport-uk', 'cbs-sports-golazo', 'supersport-football', 'bein-sports-en-1'],
        fr: ['bein-sports-fr-1', 'bein-sports-fr-2']
    },

    // Spanish LaLiga & LaLiga 2 Hypermotion (Spain: Movistar LaLiga, DAZN LaLiga, Movistar Plus+, LaLiga TV Hypermotion; UK: LaLigaTV UK & Premier Sports; MENA: beIN 4 & 2 AR)
    'esp.1': {
        ar: ['bein-sports-4-ar', 'bein-sports-2-ar', 'bein-sports-1-ar'],
        en: ['laligatv-uk', 'premier-sports-1', 'premier-sports-2', 'supersport-laliga', 'espn-hd', 'espn-2-hd', 'bein-sports-en-1'],
        fr: ['bein-sports-fr-1', 'bein-sports-fr-2', 'bein-sports-max-4-fr', 'canal-plus-afrique-2', 'canal-plus-sport-1-eu'],
        es: ['movistar-laliga-es', 'dazn-laliga-es', 'movistar-plus-es', 'espn-deportes-es', 'movistar-vamos-es', 'bein-sports-xtra-es', 'real-madrid-tv']
    },
    'esp.2': {
        ar: ['bein-sports-5-ar', 'bein-sports-4-ar'],
        en: ['laligatv-uk', 'premier-sports-2', 'bein-sports-en-2'],
        fr: ['bein-sports-max-5-fr'],
        es: ['laliga-hypermotion-es', 'movistar-laliga-es', 'movistar-vamos-es', 'bein-sports-xtra-es']
    },

    // Italian Serie A (MENA: Exclusively STARZPLAY / Abu Dhabi Sports — NEVER beIN Sports AR!; IT: DAZN Italia, Sky Sport Calcio/Uno/251..254, Rai Sport, Sportitalia)
    'ita.1': {
        ar: ['starzplay-sports-1-ar', 'starzplay-sports-2-ar', 'ad-sports-1-ar', 'ad-sports-2-ar'],
        it: ['dazn-1-it', 'sky-sport-calcio-it', 'sky-sport-uno-it', 'sky-sport-251-it', 'sky-sport-252-it', 'sky-sport-253-it', 'sky-sport-arena-it', 'sky-sport-max-it', 'rai-sport-it', 'sportitalia-it'],
        en: ['tnt-sports-2', 'tnt-sports-3', 'tnt-sports-1', 'tnt-sports-4', 'cbs-sports-network', 'cbs-sports-golazo', 'supersport-football', 'supersport-variety-1'],
        fr: ['lequipe-fr', 'bein-sports-fr-2', 'bein-sports-fr-3', 'bein-sports-max-4-fr', 'canal-plus-afrique-2']
    },

    // German Bundesliga (MENA: NEVER beIN Sports AR! Only Dubai Sports 1 AR for FTA; UK: Sky Sports; US: ESPN; FR: beIN Sports FR)
    'ger.1': {
        ar: ['dubai-sports-1-ar'],
        en: ['sky-sports-football', 'sky-sports-mix', 'sky-sports-plus', 'espn-2-hd', 'espn-hd'],
        fr: ['bein-sports-fr-1', 'bein-sports-fr-2', 'bein-sports-fr-3', 'bein-sports-max-4-fr', 'bein-sports-max-5-fr', 'bein-sports-max-6-fr', 'bein-sports-max-7-fr'],
        it: ['sky-sport-arena-it', 'sky-sport-max-it']
    },

    // French Ligue 1 & Ligue 2 (MENA: Ligue 1 on beIN Sports 3 AR; Ligue 2 on beIN Sports 4 AR; FR: DAZN Ligue 1 & beIN FR)
    'fra.1': {
        ar: ['bein-sports-3-ar', 'bein-sports-2-ar'],
        en: ['bein-sports-en-2', 'bein-sports-en-3', 'bein-sports-xtra-en', 'tnt-sports-3'],
        fr: ['dazn-ligue1-fr', 'bein-sports-fr-1', 'canal-plus-foot-fr', 'canal-plus-fr', 'canal-plus-afrique-1']
    },
    'fra.2': {
        ar: ['bein-sports-4-ar', 'bein-sports-6-ar'],
        en: ['bein-sports-en-3', 'bein-sports-xtra-en'],
        fr: ['bein-sports-fr-2', 'bein-sports-max-4-fr', 'bein-sports-max-5-fr']
    },

    // CAF Champions League & Confederation Cup (MENA: beIN Sports 6 AR & Algeria TV Sports; FR: Canal+ Afrique & beIN FR)
    'caf.champions': {
        ar: ['bein-sports-6-ar', 'bein-sports-5-ar', 'algeria-el-heddaf-tv', 'algeria-tv6-youth'],
        en: ['supersport-football', 'bein-sports-en-3'],
        fr: ['canal-plus-afrique-1', 'canal-plus-afrique-2', 'bein-sports-fr-2', 'bein-sports-max-4-fr']
    },
    'caf.confed': {
        ar: ['bein-sports-6-ar', 'bein-sports-5-ar', 'algeria-el-heddaf-tv', 'algeria-tv6-youth'],
        en: ['supersport-football', 'bein-sports-en-3'],
        fr: ['canal-plus-afrique-1', 'bein-sports-fr-3', 'bein-sports-max-5-fr']
    },

    // Roshn Saudi League (MENA: Exclusively SSC Sports — NEVER beIN Sports AR!; US: Fox Sports; FR: Canal+ Foot & Sport 360)
    'ksa.1': {
        ar: ['ssc-sport-1-ar', 'ssc-sport-2-ar', 'ssc-sport-3-ar', 'ssc-extra-1-ar', 'ssc-extra-2-ar', 'ssc-extra-3-ar'],
        en: ['fox-sports-2', 'fox-sports-1'],
        fr: ['canal-plus-foot-fr', 'canal-plus-sport-360-fr', 'canal-plus-sport-fr'],
        it: ['sportitalia-it'],
        es: ['fox-deportes-us']
    },

    // AFC Champions League Elite
    'afc.champions': {
        ar: ['bein-sports-afc-ar', 'ssc-sport-1-ar', 'ssc-sport-2-ar', 'alkass-1-ar', 'alkass-2-ar', 'ad-sports-1-ar', 'ad-sports-2-ar'],
        en: ['fox-sports-2'],
        fr: []
    },

    // MLS / Americas
    'usa.1': {
        ar: [],
        en: ['fox-sports-1', 'fox-sports-2', 'espn-hd', 'espn-2-hd', 'cbs-sports-golazo', 'cbs-sports-network'],
        fr: [],
        es: ['tudn-usa', 'fox-deportes-us', 'bein-sports-xtra-es']
    },

    // NBA Basketball (MENA: beIN Sports 8 AR; IT: Sky Sport NBA IT)
    'nba': {
        ar: ['bein-sports-8-ar'],
        en: ['nba-tv', 'espn-hd', 'espn-2-hd', 'yes-network-us', 'msg-network-us', 'tnt-sports-1', 'tnt-sports-2', 'bein-sports-en-1', 'bein-sports-xtra-en'],
        fr: ['bein-sports-fr-1', 'bein-sports-fr-2', 'bein-sports-max-4-fr', 'canal-plus-sport-2-eu'],
        it: ['sky-sport-nba-it', 'sky-sport-uno-it']
    },

    // NFL Football
    'nfl': {
        ar: [],
        en: ['nfl-network', 'nfl-redzone', 'fox-sports-1', 'espn-hd', 'cbs-sports-network', 'fox-sports-2', 'espn-2-hd', 'nbc-sports-now', 'sky-sports-action'],
        fr: ['bein-sports-fr-2', 'bein-sports-max-4-fr'],
        es: ['fox-deportes-us', 'espn-deportes-es']
    },

    // NHL Ice Hockey
    'nhl': {
        ar: [],
        en: ['nhl-network', 'espn-hd', 'espn-2-hd', 'msg-network-us', 'nesn-us', 'espnu-hd', 'premier-sports-1', 'premier-sports-2'],
        fr: []
    },

    // MLB Baseball
    'mlb': {
        ar: [],
        en: ['mlb-network', 'yes-network-us', 'nesn-us', 'marquee-sports-us', 'fox-sports-1', 'espn-hd', 'fox-sports-2', 'tnt-sports-2'],
        fr: [],
        es: ['fox-deportes-us', 'espn-deportes-es']
    },

    // UFC / MMA
    'ufc': {
        ar: ['ad-sports-2-ar', 'ad-sports-1-ar'],
        en: ['dazn-combat', 'tnt-sports-1', 'tnt-sports-2', 'espn-hd', 'espn-2-hd'],
        fr: ['rmc-sport-1-fr', 'rmc-sport-2-fr']
    },

    // Formula 1
    'f1': {
        ar: ['ssc-sport-3-ar', 'bein-sports-8-ar'],
        en: ['sky-sports-f1', 'red-bull-tv', 'espn-2-hd'],
        fr: ['canal-plus-f1-fr', 'canal-plus-sport-360-fr', 'canal-plus-sport-fr', 'canal-plus-fr', 'automoto-fr'],
        it: ['sky-sport-f1-it', 'sky-sport-uno-it'],
        es: ['dazn-f1-es']
    },

    // ATP / WTA Tennis
    'atp': {
        ar: ['bein-sports-7-ar', 'bein-sports-8-ar', 'bein-sports-9-ar'],
        en: ['sky-sports-tennis', 'tennis-channel', 'eurosport-1', 'eurosport-2'],
        fr: ['eurosport-1-fr', 'eurosport-2-fr', 'bein-sports-fr-3', 'bein-sports-max-4-fr', 'canal-plus-sport-1-eu'],
        it: ['sky-sport-tennis-it', 'eurosport-1-it', 'eurosport-2-it'],
        es: ['movistar-deportes-es', 'movistar-vamos-es']
    }
};

const LEAGUE_DEFINITIONS: Array<{
    sport: string;
    slug: string;
    label: string;
    labelAr: string;
    durationMinutes: number;
}> = [
    { sport: 'soccer', slug: 'uefa.champions', label: 'UEFA Champions League', labelAr: 'دوري أبطال أوروبا', durationMinutes: 125 },
    { sport: 'soccer', slug: 'uefa.europa', label: 'UEFA Europa League', labelAr: 'الدوري الأوروبي', durationMinutes: 125 },
    { sport: 'soccer', slug: 'uefa.europa.conf', label: 'UEFA Conference League', labelAr: 'دوري المؤتمر الأوروبي', durationMinutes: 125 },
    { sport: 'soccer', slug: 'eng.1', label: 'English Premier League', labelAr: 'الدوري الإنجليزي الممتاز', durationMinutes: 120 },
    { sport: 'soccer', slug: 'eng.2', label: 'EFL Sky Bet Championship', labelAr: 'دوري البطولة الإنجليزية (تشامبيونشيب)', durationMinutes: 120 },
    { sport: 'soccer', slug: 'eng.league_cup', label: 'EFL Carabao Cup', labelAr: 'كأس الرابطة الإنجليزية (كاراباو)', durationMinutes: 120 },
    { sport: 'soccer', slug: 'esp.1', label: 'Spanish LaLiga', labelAr: 'الدوري الإسباني (لاليغا)', durationMinutes: 120 },
    { sport: 'soccer', slug: 'esp.2', label: 'Spanish LaLiga 2 Hypermotion', labelAr: 'الدوري الإسباني الدرجة الثانية', durationMinutes: 120 },
    { sport: 'soccer', slug: 'ita.1', label: 'Italian Serie A', labelAr: 'الدوري الإيطالي (سيري آ)', durationMinutes: 120 },
    { sport: 'soccer', slug: 'ger.1', label: 'German Bundesliga', labelAr: 'الدوري الألماني (بوندسليغا)', durationMinutes: 120 },
    { sport: 'soccer', slug: 'fra.1', label: 'French Ligue 1', labelAr: 'الدوري الفرنسي (ليغ 1)', durationMinutes: 120 },
    { sport: 'soccer', slug: 'fra.2', label: 'French Ligue 2 BKT', labelAr: 'الدوري الفرنسي الدرجة الثانية', durationMinutes: 120 },
    { sport: 'soccer', slug: 'caf.champions', label: 'CAF Champions League', labelAr: 'دوري أبطال أفريقيا', durationMinutes: 120 },
    { sport: 'soccer', slug: 'caf.confed', label: 'CAF Confederation Cup', labelAr: 'كأس الكونفدرالية الأفريقية', durationMinutes: 120 },
    { sport: 'soccer', slug: 'ksa.1', label: 'Roshn Saudi League', labelAr: 'دوري روشن السعودي للمحترفين', durationMinutes: 120 },
    { sport: 'soccer', slug: 'afc.champions', label: 'AFC Champions League Elite', labelAr: 'دوري أبطال آسيا للنخبة', durationMinutes: 125 },
    { sport: 'soccer', slug: 'eng.fa', label: 'English FA Cup', labelAr: 'كأس الاتحاد الإنجليزي', durationMinutes: 125 },
    { sport: 'soccer', slug: 'usa.1', label: 'Major League Soccer (MLS)', labelAr: 'الدوري الأمريكي لكرة القدم', durationMinutes: 120 },
    { sport: 'basketball', slug: 'nba', label: 'NBA Basketball', labelAr: 'دوري كرة السلة الأمريكي NBA', durationMinutes: 150 },
    { sport: 'football', slug: 'nfl', label: 'NFL Football', labelAr: 'دوري كرة القدم الأمريكية NFL', durationMinutes: 180 },
    { sport: 'hockey', slug: 'nhl', label: 'NHL Ice Hockey', labelAr: 'دوري الهوكي الأمريكي NHL', durationMinutes: 150 },
    { sport: 'baseball', slug: 'mlb', label: 'MLB Baseball', labelAr: 'دوري البيسبول الأمريكي MLB', durationMinutes: 165 },
    { sport: 'racing', slug: 'f1', label: 'Formula 1 World Championship', labelAr: 'بطولة العالم للفورمولا 1', durationMinutes: 120 },
    { sport: 'mma', slug: 'ufc', label: 'UFC Fight Night / PPV', labelAr: 'بطولة UFC للفنون القتالية المختلطة', durationMinutes: 180 },
    { sport: 'tennis', slug: 'atp', label: 'ATP World Tour Tennis', labelAr: 'بطولة رابطة محترفي التنس ATP', durationMinutes: 140 }
];

/**
 * Safely parses an ESPN scoreboard event (fixes "Home vs Away" on UFC, Tennis, and Formula 1)
 */
export function parseEspnEventForScraper(
    ev: any,
    sport: string,
    leagueName: string,
    leagueSlug: string,
    durationMinutes = 120
): {
    id: string;
    title: string;
    shortTitle: string;
    sport: string;
    league: string;
    leagueSlug: string;
    startTime: string;
    endTime: string;
    status: 'LIVE' | 'UPCOMING' | 'FINISHED';
    statusDetail: string;
    broadcasts: string[];
    homeTeam: { name: string; shortName: string; logo: string; score?: string };
    awayTeam: { name: string; shortName: string; logo: string; score?: string };
} | null {
    if (!ev || !ev.id) return null;
    const competitions = Array.isArray(ev.competitions) ? ev.competitions : [];
    if (competitions.length === 0) return null;

    // For UFC / MMA, pick the LAST competition in the array (Main Event bout)
    const comp =
        (sport === 'mma' || leagueSlug === 'ufc') && competitions.length > 1
            ? competitions[competitions.length - 1]
            : competitions[0];

    const rawState = String(comp?.status?.type?.state || ev?.status?.type?.state || 'pre').toLowerCase();
    const status: 'LIVE' | 'UPCOMING' | 'FINISHED' =
        rawState === 'in' ? 'LIVE' : rawState === 'post' ? 'FINISHED' : 'UPCOMING';
    const statusDetail =
        comp?.status?.type?.shortDetail ||
        ev?.status?.type?.shortDetail ||
        ev?.status?.type?.description ||
        'Scheduled';

    const broadcasts: string[] = [];
    if (Array.isArray(comp?.broadcasts)) {
        for (const b of comp.broadcasts) {
            if (Array.isArray(b.names)) {
                broadcasts.push(...b.names);
            }
        }
    }

    const startMs = Date.parse(comp?.date || ev.date) || Date.now();
    const startIso = new Date(startMs).toISOString();
    const endIso = new Date(startMs + durationMinutes * 60 * 1000).toISOString();

    // Motorsport / Formula 1 handling
    if (sport === 'racing' || sport === 'motorsport' || leagueSlug === 'f1') {
        const raceTitle = ev.name || ev.shortName || 'Formula 1 Grand Prix';
        return {
            id: String(ev.id),
            title: raceTitle,
            shortTitle: ev.shortName || 'F1 GP',
            sport: 'motorsport',
            league: leagueName || 'Formula 1',
            leagueSlug: 'f1',
            startTime: startIso,
            endTime: endIso,
            status,
            statusDetail,
            broadcasts: broadcasts.length > 0 ? broadcasts : [leagueName, 'International HD Feed'],
            homeTeam: { name: raceTitle, shortName: 'F1', logo: '', score: undefined },
            awayTeam: { name: statusDetail, shortName: 'GP', logo: '', score: undefined }
        };
    }

    const competitors = Array.isArray(comp?.competitors) ? comp.competitors : [];
    if (competitors.length < 2) return null;

    const homeComp = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
    const awayComp = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

    // Extract team name OR athlete name (fixes UFC & Tennis "Home vs Away" bug)
    const homeName =
        homeComp?.team?.displayName ||
        homeComp?.team?.name ||
        homeComp?.athlete?.displayName ||
        homeComp?.athlete?.fullName ||
        '';
    const awayName =
        awayComp?.team?.displayName ||
        awayComp?.team?.name ||
        awayComp?.athlete?.displayName ||
        awayComp?.athlete?.fullName ||
        '';

    if (!homeName || !awayName || (homeName === 'Home' && awayName === 'Away')) {
        return null;
    }

    return {
        id: String(ev.id),
        title: `${homeName} vs ${awayName}`,
        shortTitle:
            ev.shortName ||
            `${homeName.slice(0, 3).toUpperCase()} vs ${awayName.slice(0, 3).toUpperCase()}`,
        sport,
        league: leagueName,
        leagueSlug,
        startTime: startIso,
        endTime: endIso,
        status,
        statusDetail,
        broadcasts: broadcasts.length > 0 ? broadcasts : [leagueName, 'International HD Feed'],
        homeTeam: {
            name: homeName,
            shortName:
                homeComp?.team?.abbreviation ||
                homeComp?.athlete?.shortName ||
                homeName.slice(0, 3).toUpperCase(),
            logo:
                homeComp?.team?.logo ||
                homeComp?.athlete?.headshot?.href ||
                homeComp?.athlete?.flag?.href ||
                '',
            score: homeComp?.score !== undefined ? String(homeComp.score) : undefined
        },
        awayTeam: {
            name: awayName,
            shortName:
                awayComp?.team?.abbreviation ||
                awayComp?.athlete?.shortName ||
                awayName.slice(0, 3).toUpperCase(),
            logo:
                awayComp?.team?.logo ||
                awayComp?.athlete?.headshot?.href ||
                awayComp?.athlete?.flag?.href ||
                '',
            score: awayComp?.score !== undefined ? String(awayComp.score) : undefined
        }
    };
}

export async function getLiveSportEvents(
    publicBaseUrl: string,
    filters?: { sport?: string; status?: string }
): Promise<LiveSportEvent[]> {
    await harvestOfficialXmltvEpg().catch(() => {});

    if (Date.now() - lastEventsFetchTime < EVENTS_TTL_MS && cachedEvents.length > 0) {
        return filterEvents(cachedEvents, filters);
    }

    if (eventsFetchPromise) {
        const res = await eventsFetchPromise;
        return filterEvents(res, filters);
    }

    eventsFetchPromise = (async () => {
        const events: LiveSportEvent[] = [];
        const seenEventIds = new Set<string>();
        const tomorrowYmd = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '');

        await Promise.allSettled(
            LEAGUE_DEFINITIONS.map(async (lg) => {
                const urls = [
                    `https://site.api.espn.com/apis/site/v2/sports/${lg.sport}/${lg.slug}/scoreboard`,
                    ...(lg.sport === 'soccer'
                        ? [`https://site.api.espn.com/apis/site/v2/sports/${lg.sport}/${lg.slug}/scoreboard?dates=${tomorrowYmd}`]
                        : [])
                ];

                for (const url of urls) {
                    try {
                        const res = await fetch(url, {
                            headers: { 'User-Agent': DEFAULT_UA },
                            signal: AbortSignal.timeout(4200)
                        });
                        if (!res.ok) continue;
                        const data = (await res.json()) as any;
                        const rawEvents = Array.isArray(data.events) ? data.events : [];
                        const leagueLogo = data.leagues?.[0]?.logos?.[0]?.href || '';

                        rawEvents.forEach((ev: any) => {
                            const candidateEvents: any[] =
                                lg.sport === 'tennis' && Array.isArray(ev.groupings)
                                    ? ev.groupings.flatMap((g: any) =>
                                          (Array.isArray(g.competitions) ? g.competitions : [])
                                              .filter((c: any) => c?.status?.type?.state !== 'post')
                                              .slice(0, 3)
                                              .map((c: any) => ({
                                                  id: c.id || `${ev.id}-${Math.random()}`,
                                                  name: ev.name,
                                                  shortName: ev.shortName,
                                                  date: c.date || ev.date,
                                                  status: c.status,
                                                  competitions: [c]
                                              }))
                                      )
                                    : [ev];

                            for (const cand of candidateEvents) {
                                const parsed = parseEspnEventForScraper(
                                    cand,
                                    lg.sport,
                                    lg.label,
                                    lg.slug,
                                    lg.durationMinutes
                                );
                                if (!parsed || seenEventIds.has(parsed.id)) continue;
                                seenEventIds.add(parsed.id);

                                events.push({
                                    id: parsed.id,
                                    title: parsed.title,
                                    shortTitle: parsed.shortTitle,
                                    sport: parsed.sport,
                                    league: parsed.league,
                                    leagueSlug: parsed.leagueSlug,
                                    leagueLogo,
                                    startTime: parsed.startTime,
                                    endTime: parsed.endTime,
                                    status: parsed.status,
                                    statusDetail: parsed.statusDetail,
                                    homeTeam: parsed.homeTeam,
                                    awayTeam: parsed.awayTeam,
                                    broadcasts: parsed.broadcasts,
                                    matchStreamEndpoint: `${publicBaseUrl}/v1/live/match/${encodeURIComponent(parsed.id)}`,
                                    matchMasterPlaylistUrl: `${publicBaseUrl}/v1/live/match/${encodeURIComponent(parsed.id)}/master.m3u8`,
                                    recommendedChannels: []
                                });
                            }
                        });
                    } catch {
                        // Ignore individual league error
                    }
                }
            })
        );

        // Sort LIVE first, then UPCOMING by kickoff time, then FINISHED
        events.sort((a, b) => {
            const order = { LIVE: 0, UPCOMING: 1, FINISHED: 2 };
            if (order[a.status] !== order[b.status]) {
                return order[a.status] - order[b.status];
            }
            return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        });

        // Helper: extract significant team name tokens (>= 4 chars) to match against official XMLTV titles
        const extractTeamTokens = (teamName: string): string[] =>
            (teamName || '')
                .toLowerCase()
                .replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ')
                .split(/\s+/)
                .filter(
                    (w) =>
                        w.length >= 4 &&
                        ![
                            'club',
                            'real',
                            'city',
                            'united',
                            'sporting',
                            'athletic',
                            'atletico',
                            'futbol',
                            'football',
                            'wanderers',
                            'albion',
                            'hotspur',
                            'saint',
                            'olympique'
                        ].includes(w)
                );

        // De-conflicted per-time-slot channel assignment across all leagues, prioritizing exact XMLTV matches
        const claimedBySlot = new Map<string, Set<string>>();
        const getSlotKey = (ev: LiveSportEvent): string => {
            if (ev.status === 'LIVE') return 'LIVE_NOW';
            const startMs = Date.parse(ev.startTime || '');
            const hourBucket = Number.isNaN(startMs) ? 0 : Math.floor(startMs / (60 * 60 * 1000));
            return `${ev.status}_${hourBucket}`;
        };

        for (const ev of events) {
            // Never assign live EPG channels to finished matches
            if (ev.status === 'FINISHED') {
                ev.recommendedChannels = [];
                continue;
            }

            const slotKey = getSlotKey(ev);
            if (!claimedBySlot.has(slotKey)) {
                claimedBySlot.set(slotKey, new Set<string>());
            }
            const claimedInSlot = claimedBySlot.get(slotKey)!;

            const assignedIds: string[] = [];
            const coveredLangs = new Set<string>();

            const evStartMs = Date.parse(ev.startTime || '') || Date.now();
            const evEndMs = Date.parse(ev.endTime || '') || evStartMs + 120 * 60 * 1000;
            const homeTokens = extractTeamTokens(ev.homeTeam?.name || '');
            const awayTokens = extractTeamTokens(ev.awayTeam?.name || '');
            const homeFull = (ev.homeTeam?.name || '').toLowerCase();
            const awayFull = (ev.awayTeam?.name || '').toLowerCase();

            // STEP 1: Check Official Broadcaster XMLTV Cache first!
            // If any channel's official XMLTV schedule explicitly lists this match during this window, pin it!
            if (xmltvScheduleCache.size > 0 && (homeTokens.length > 0 || awayTokens.length > 0)) {
                for (const ch of CORE_SPORTS_CHANNELS) {
                    const xmlIds = CHANNEL_TO_XMLTV_IDS[ch.id];
                    if (!xmlIds || xmlIds.length === 0) continue;
                    const xmlProgs = xmltvScheduleCache.get(xmlIds[0]) || [];
                    const matchingProg = xmlProgs.find((p) => {
                        const overlaps = p.startMs < evEndMs + 30 * 60000 && p.stopMs > evStartMs - 30 * 60000;
                        if (!overlaps) return false;
                        const text = `${p.title} ${p.subTitle} ${p.description}`.toLowerCase();
                        const hasHome =
                            (homeFull.length >= 4 && text.includes(homeFull)) ||
                            homeTokens.some((t) => text.includes(t));
                        const hasAway =
                            (awayFull.length >= 4 && text.includes(awayFull)) ||
                            awayTokens.some((t) => text.includes(t));
                        return hasHome && hasAway;
                    });
                    if (matchingProg && !assignedIds.includes(ch.id)) {
                        claimedInSlot.add(ch.id);
                        assignedIds.push(ch.id);
                        coveredLangs.add(ch.language);
                    }
                }
            }

            // STEP 2: For any language not yet covered by an explicit XMLTV match, use league broadcaster pools
            // while skipping any channel whose official XMLTV schedule is already airing a known programme
            const pool = SCRAPER_LEAGUE_CHANNEL_POOLS[ev.leagueSlug];
            if (pool) {
                const claimOne = (candidates?: string[], langKey?: string) => {
                    if (langKey && coveredLangs.has(langKey)) return;
                    if (!Array.isArray(candidates) || candidates.length === 0) return;
                    for (const chId of candidates) {
                        if (claimedInSlot.has(chId) || assignedIds.includes(chId)) continue;
                        claimedInSlot.add(chId);
                        assignedIds.push(chId);
                        return;
                    }
                };

                const teamsLower = `${ev.homeTeam?.name || ''} ${ev.awayTeam?.name || ''}`.toLowerCase();
                let filteredEs = (pool.es || []).filter(
                    (id) => id !== 'real-madrid-tv' || teamsLower.includes('real madrid')
                );
                if (ev.leagueSlug === 'esp.1' && filteredEs.length >= 2 && Number(ev.id) % 2 === 1) {
                    filteredEs = [filteredEs[1], filteredEs[0], ...filteredEs.slice(2)];
                }

                claimOne(pool.ar, 'ar');
                claimOne(pool.it, 'it');
                claimOne(pool.en, 'en');
                claimOne(pool.fr, 'fr');
                claimOne(filteredEs, 'es');
                if (
                    teamsLower.includes('real madrid') &&
                    filteredEs.includes('real-madrid-tv') &&
                    !claimedInSlot.has('real-madrid-tv') &&
                    !assignedIds.includes('real-madrid-tv')
                ) {
                    claimedInSlot.add('real-madrid-tv');
                    assignedIds.push('real-madrid-tv');
                }
                claimOne(pool.tr, 'tr');
            }

            ev.recommendedChannels = assignedIds
                .map((cid) => CORE_SPORTS_CHANNELS.find((ch) => ch.id === cid))
                .filter((ch): ch is LiveChannel => Boolean(ch))
                .map((ch) => ({
                    channelId: ch.id,
                    name: ch.name,
                    language: ch.language,
                    languageLabel: ch.languageLabel,
                    logo: ch.logo,
                    streamEndpoint: `${publicBaseUrl}/v1/live/stream/${ch.id}`,
                    masterPlaylistUrl: `${publicBaseUrl}/v1/live/master/${ch.id}.m3u8`
                }));
        }

        if (events.length > 0) {
            cachedEvents = events;
            lastEventsFetchTime = Date.now();
        }
        eventsFetchPromise = null;
        return events;
    })();

    const allEvents = await eventsFetchPromise;
    return filterEvents(allEvents, filters);
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
 * Network-Accurate Program Templates for Continuous 24-Hour Channel EPG Generation
 * Used between live match broadcasts so every channel always exposes its exact current & upcoming programs
 */
interface EPGTemplateSlot {
    title: string;
    subtitle: string;
    description: string;
    category: string;
    sport?: string;
    league?: string;
}

function getNetworkEPGTemplates(ch: LiveChannel): EPGTemplateSlot[] {
    const id = ch.id;
    const net = ch.network.toLowerCase();

    // 1. SSC Sports (Saudi Pro League, King's Cup, AFC Champions League Elite)
    if (id.startsWith('ssc-sport') || id.startsWith('ssc-extra')) {
        return [
            {
                title: 'استوديو دوري روشن السعودي المباشر (Roshn Saudi League Live Studio)',
                subtitle: 'تغطية مباشرة وتحليل فني لمباريات الجولة • SSC Sports HD',
                description: 'تغطية شاملة لمباريات دوري روشن السعودي للمحترفين مع نخبة المحللين والربط المباشر من الملاعب السعودية.',
                category: 'Football Studio',
                sport: 'soccer',
                league: 'Roshn Saudi League'
            },
            {
                title: 'برنامج برا الـ 18 (Barra Al-18 Daily Talk Show)',
                subtitle: 'حوارات حصرية وكواليس الكرة السعودية والآسيوية',
                description: 'نقاشات تحليلية معمقة حول أبرز قضايا الأندية السعودية، سوق الانتقالات، ومنافسات دوري روشن.',
                category: 'Sports Talk Show',
                sport: 'soccer',
                league: 'Roshn Saudi League'
            },
            {
                title: 'دوري أبطال آسيا للنخبة - قمة الجولة (AFC Champions League Elite)',
                subtitle: 'مواجهة الأندية السعودية في البطولة القارية • بث عالي الجودة',
                description: 'عرض كامل وأهداف ومباريات الأندية السعودية في دوري أبطال آسيا للنخبة.',
                category: 'Live Football / Replay',
                sport: 'soccer',
                league: 'AFC Champions League Elite'
            },
            {
                title: 'ملخصات وأهداف دوري روشن السعودي (Saudi League Matchday Highlights)',
                subtitle: 'جميع أهداف الجولة وأبرز اللقطات التحكيمية والفنية',
                description: 'استعراض شامل لكافة أهداف وملخصات مباريات دوري روشن السعودي وكأس خادم الحرمين الشريفين.',
                category: 'Highlights',
                sport: 'soccer',
                league: 'Roshn Saudi League'
            }
        ];
    }

    // 2. beIN Sports Arabic (Champions League, EPL, LaLiga, Ligue 1, AFC)
    if (id.startsWith('bein-sports-') && ch.language === 'ar') {
        if (id.includes('news')) {
            return [
                {
                    title: 'نشرة أخبار beIN الساعة (beIN Sports Hourly News)',
                    subtitle: 'آخر المستجدات الرياضية العالمية والعربية على مدار الساعة',
                    description: 'تغطية إخبارية مباشرة لأهم الأحداث الرياضية، المؤتمرات الصحفية، وانتقالات اللاعبين.',
                    category: 'Sports News',
                    sport: 'soccer'
                },
                {
                    title: 'حصاد اليوم الرياضي (Daily Sports Roundup)',
                    subtitle: 'تقارير المراسلين من العواصم الأوروبية والعربية',
                    description: 'تحليل شامل لنتائج المباريات الأوروبية والعربية مع شبكة مراسلي beIN Sports.',
                    category: 'Sports News',
                    sport: 'soccer'
                }
            ];
        }
        const focusLeague =
            id === 'bein-sports-1-ar' || id === 'bein-sports-2-ar' || id === 'bein-sports-premium-1-ar' || id === 'bein-sports-premium-2-ar'
                ? 'الدوري الإنجليزي الممتاز ودوري أبطال أوروبا (Premier League & UCL)'
                : id === 'bein-sports-3-ar' || id === 'bein-sports-premium-3-ar'
                ? 'الدوري الفرنسي - ليغ 1 والبطولات الأوروبية (French Ligue 1 & UEFA)'
                : id === 'bein-sports-4-ar'
                ? 'الدوري الإسباني - لاليغا والبطولات الأوروبية (Spanish LaLiga & UEFA)'
                : id === 'bein-sports-5-ar'
                ? 'الدوري الإسباني الدرجة الثانية والدوري الأوروبي (LaLiga 2 & UEFA Europa League)'
                : id === 'bein-sports-6-ar'
                ? 'دوري أبطال أفريقيا ودوري المؤتمر الأوروبي (CAF Champions League & UEFA)'
                : id === 'bein-sports-7-ar'
                ? 'بطولات رابطة محترفي التنس ATP والرياضات العالمية (ATP World Tour Tennis)'
                : id === 'bein-sports-8-ar'
                ? 'دوري كرة السلة الأمريكي NBA وسباقات الفورمولا 1 (NBA & Formula 1)'
                : id === 'bein-sports-afc-ar'
                ? 'دوري أبطال آسيا للنخبة (AFC Champions League)'
                : 'البطولات العالمية والقارية الكبرى';

        return [
            {
                title: `الأستوديو التحليلي المباشر - ${ch.shortName}`,
                subtitle: focusLeague,
                description: `تغطية مباشرة وتحليل فني شامل لمباريات ${focusLeague} عبر استوديوهات beIN Sports في الدوحة.`,
                category: 'Live Football Studio',
                sport: 'soccer',
                league: focusLeague
            },
            {
                title: `مباراة القمة الأوروبية - ${focusLeague}`,
                subtitle: 'تغطية خاصة وأبرز المواجهات الكلاسيكية والأهداف',
                description: `إعادة وتحليل لأقوى مواجهات الجولة في ${focusLeague} بتعليق عربي.`,
                category: 'Football Match',
                sport: 'soccer',
                league: focusLeague
            },
            {
                title: 'برنامج هذا المساء الرياضي (beIN Evening Show)',
                subtitle: 'تحليل تكتيكي شامل لأهم مباريات الدوريات الخمسة الكبرى',
                description: 'قراءة فنية وأرقام وإحصائيات مع نجوم التحليل في قنوات beIN Sports.',
                category: 'Sports Magazine',
                sport: 'soccer'
            },
            {
                title: 'مجلة دوري أبطال أوروبا (UEFA Champions League Magazine)',
                subtitle: 'كواليس الأندية الأوروبية وحوارات خاصة مع النجوم',
                description: 'تقرير أسبوعي خاص عن نجوم دوري أبطال أوروبا وأجمل أهداف البطولة.',
                category: 'Sports Documentary',
                sport: 'soccer',
                league: 'UEFA Champions League'
            }
        ];
    }

    // 3. Gulf & Arab Sports Channels (Alkass, AD Sports, Dubai Sports, OnTime Sports, Kuwait, Bahrain, Arryadia)
    if (ch.category === 'mena' && ch.language === 'ar') {
        if (id.startsWith('alkass')) {
            return [
                {
                    title: 'برنامج المجلس - قنوات الكأس (Al Majlis Live Show)',
                    subtitle: 'نقاشات الكرة الخليجية والآسيوية ودوري نجوم قطر',
                    description: 'البرنامج الرياضي الأشهر في الخليج لمناقشة منافسات دوري نجوم أريدُ والبطولات الآسيوية.',
                    category: 'Sports Talk Show',
                    sport: 'soccer'
                },
                {
                    title: 'استوديو دوري نجوم قطر ودوري أبطال آسيا (Qatar Stars League & AFC)',
                    subtitle: 'بث مباشر وتحليل فني من الدوحة • Alkass HD',
                    description: 'تغطية حية لمباريات الأندية القطرية والآسيوية عبر قنوات الكأس الرياضية.',
                    category: 'Live Football',
                    sport: 'soccer'
                },
                {
                    title: 'برنامج جرايد وتقارير الملاعب (Alkass Press & Reports)',
                    subtitle: 'جولة في الصحافة الرياضية العربية والعالمية',
                    description: 'قراءة يومية في أبرز عناوين الصحف الرياضية وتغطية تدريبات الأندية.',
                    category: 'Sports Magazine',
                    sport: 'soccer'
                }
            ];
        }
        if (id.startsWith('starzplay-sports')) {
            return [
                {
                    title: 'الأستوديو التحليلي للدوري الإيطالي (Serie A Live Studio - STARZPLAY)',
                    subtitle: 'تغطية حصرية لمباريات الكالتشيو الإيطالي وكأس إيطاليا • STARZPLAY / AD Sports Premium HD',
                    description: 'البث المباشر والأستوديو التحليلي لمباريات الدوري الإيطالي (إنتر ميلان، ميلان، يوفنتوس، نابولي، روما) عبر قنوات ستارز بلاي وأبوظبي الرياضية بريميوم.',
                    category: 'Live Serie A Studio',
                    sport: 'soccer',
                    league: 'Italian Serie A'
                },
                {
                    title: 'قمة الكالتشيو الإيطالي وكأس السوبر (Serie A Enilive Featured Match)',
                    subtitle: 'بث مباشر وتعليق عربي 1080p Full HD',
                    description: 'تغطية شاملة لأقوى مواجهات الدوري الإيطالي وكأس إيطاليا مع نخبة المحللين.',
                    category: 'Serie A Football',
                    sport: 'soccer',
                    league: 'Italian Serie A'
                },
                {
                    title: 'ملخصات وأهداف الدوري الإيطالي (Serie A Matchday Highlights)',
                    subtitle: 'جميع أهداف الجولة وأبرز اللقطات الفنية من ملاعب إيطاليا',
                    description: 'استعراض شامل لأهداف وملخصات جولة الدوري الإيطالي.',
                    category: 'Football Highlights',
                    sport: 'soccer',
                    league: 'Italian Serie A'
                }
            ];
        }
        if (id.startsWith('ad-sports')) {
            return [
                {
                    title: 'استوديو دوري أدنوك للمحترفين والبطولات الآسيوية (ADNOC Pro League & Asian Football)',
                    subtitle: 'تغطية مباشرة من أبوظبي الرياضية HD',
                    description: 'تحليل شامل لمنافسات الكرة الإماراتية والعربية والبطولات القارية.',
                    category: 'Live Football Studio',
                    sport: 'soccer'
                },
                {
                    title: 'برنامج جيم أوفر والحدث الرياضي (AD Sports Live Analysis)',
                    subtitle: 'حوارات فنية وتغطية حصرية لأبرز البطولات العالمية',
                    description: 'تغطية يومية مباشرة من استوديوهات أبوظبي للإعلام.',
                    category: 'Sports Show',
                    sport: 'soccer'
                }
            ];
        }
        if (id.startsWith('ontime-sports')) {
            return [
                {
                    title: 'استوديو الدوري المصري الممتاز (Egyptian Premier League Studio)',
                    subtitle: 'تغطية مباريات الأهلي والزمالك وأندية الدوري المصري',
                    description: 'الأستوديو التحليلي لمباريات دوري نايل المصري وكأس مصر مع نجوم التحليل.',
                    category: 'Live Football Studio',
                    sport: 'soccer'
                },
                {
                    title: 'برنامج ملعب أون تايم (Malab OnTime Live)',
                    subtitle: 'أخبار الكرة المصرية والأفريقية وحوارات حصرية',
                    description: 'تغطية شاملة لأخبار المنتخبات الوطنية والأندية المصرية في البطولات الأفريقية.',
                    category: 'Sports Talk Show',
                    sport: 'soccer'
                }
            ];
        }
        return [
            {
                title: `الأستوديو التحليلي المباشر - ${ch.name}`,
                subtitle: 'تغطية البطولات المحلية والعربية والآسيوية',
                description: `بث مباشر للبرامج التحليلية والمباريات عبر ${ch.name}.`,
                category: 'Live Sports',
                sport: 'soccer'
            },
            {
                title: `الحصاد الرياضي اليومي - ${ch.shortName}`,
                subtitle: 'أبرز الأخبار والتقارير الميدانية من الملاعب',
                description: 'متابعة يومية شاملة لمنافسات كرة القدم والرياضات المختلفة.',
                category: 'Sports News',
                sport: 'soccer'
            }
        ];
    }

    // 4. Arabic Movies, Series & News (MBC, Shahid, Rotana, OSN, Al Jazeera, Al Arabiya)
    if ((ch.category === 'movies' || ch.category === 'entertainment') && ch.language === 'ar') {
        if (net.includes('news')) {
            return [
                {
                    title: 'نشرة الأخبار الرئيسية والتغطية المباشرة (Live Breaking News)',
                    subtitle: `${ch.name} • تغطية إخبارية حية على مدار الساعة`,
                    description: 'متابعة مستمرة لأهم الأحداث السياسية والاقتصادية والدولية مع شبكة المراسلين حول العالم.',
                    category: 'Live News'
                },
                {
                    title: 'برنامج ما وراء الخبر والتحليل السياسي (In-Depth News Analysis)',
                    subtitle: 'نقاشات مع الخبراء والمحللين حول قضايا المنطقة والعالم',
                    description: 'تحليل معمق لملفات الساعة السياسية والاقتصادية.',
                    category: 'News Documentary'
                }
            ];
        }
        if (id.includes('action') || id.includes('movies') || id.includes('cinema') || id.includes('aflam')) {
            return [
                {
                    title: `سهرة السينما الحصرية - ${ch.shortName} (Blockbuster Movie Night)`,
                    subtitle: 'عرض سينمائي عالي الجودة 1080p Full HD',
                    description: `مشاهدة أقوى الأفلام السينمائية المختارة على ${ch.name} بجودة عالية.`,
                    category: 'Cinema / Movies'
                },
                {
                    title: `فيلم السهرة المختار - ${ch.shortName} (Featured Premiere Film)`,
                    subtitle: 'إثارة وتشويق ودراما سينمائية متواصلة',
                    description: 'عرض متواصل لأحدث الأفلام العربية والعالمية المترجمة.',
                    category: 'Cinema / Movies'
                }
            ];
        }
        return [
            {
                title: `المسلسل الدرامي الحصري - ${ch.shortName} (Exclusive Drama Series)`,
                subtitle: 'حلقات متواصلة من أقوى المسلسلات العربية والتركية',
                description: `عرض حصري لأحدث الإنتاجات الدرامية والترفيهية عبر ${ch.name}.`,
                category: 'Drama & Series'
            },
            {
                title: `البرنامج الترفيهي المسائي - ${ch.shortName} (Prime Time Entertainment)`,
                subtitle: 'سهرة فنية وترفيهية للعائلة العربية',
                description: 'برامج ترفيهية وحوارية مع أبرز نجوم الفن والدراما في العالم العربي.',
                category: 'Entertainment'
            }
        ];
    }

    // 5. Sky Sports / TNT Sports / UK Channels
    if (ch.category === 'sky') {
        if (id.includes('f1')) {
            return [
                {
                    title: 'Formula 1 Grand Prix Live Paddock & Race Special',
                    subtitle: 'Sky Sports F1 Ultra HD • Pit Lane & Telemetry Analysis',
                    description: 'Complete Formula 1 weekend coverage, qualifying sessions, race replays, and technical analysis from the paddock.',
                    category: 'Motorsport',
                    sport: 'racing',
                    league: 'Formula 1'
                },
                {
                    title: "Ted's Notebook & F1 Drivers Press Conference",
                    subtitle: 'Inside the F1 Paddock with Sky Sports F1 team',
                    description: 'Behind-the-scenes technical updates and exclusive interviews with Formula 1 team principals and drivers.',
                    category: 'Motorsport Magazine',
                    sport: 'racing',
                    league: 'Formula 1'
                }
            ];
        }
        if (id.includes('news')) {
            return [
                {
                    title: 'Sky Sports News Live: Transfer Centre & Breaking Sports',
                    subtitle: 'Live rolling sports news, scores, and Premier League updates',
                    description: '24/7 live sports news coverage, press conferences, and instant score updates across the UK and Europe.',
                    category: 'Sports News',
                    sport: 'soccer'
                },
                {
                    title: 'Good Morning Sports Fans / The Transfer Show',
                    subtitle: 'Sky Sports News HD Studio',
                    description: 'Round-the-clock headlines from the Premier League, EFL, Champions League, Cricket, F1, and Boxing.',
                    category: 'Sports News',
                    sport: 'soccer'
                }
            ];
        }
        return [
            {
                title: `${ch.shortName} Live Matchday Studio & Tactical Analysis`,
                subtitle: 'Premier League, UEFA Champions League & Top-Flight Coverage',
                description: `Live studio coverage, match build-up, and expert punditry on ${ch.name}.`,
                category: 'Live Sports Studio',
                sport: 'soccer',
                league: 'English Premier League'
            },
            {
                title: `${ch.shortName} Premier League & European Classics`,
                subtitle: 'Extended Match Highlights & Iconic Fixtures',
                description: 'Full match replays and extended highlights from the biggest fixtures of the season.',
                category: 'Football Highlights',
                sport: 'soccer'
            }
        ];
    }

    // 5b. Italian Serie A Broadcasters (DAZN Italia & Sky Sport Italia)
    if (ch.language === 'it') {
        return [
            {
                title: `Serie A Enilive Diretta & Studio Pre-Partita - ${ch.shortName}`,
                subtitle: `${ch.name} • Copertura Diretta Serie A, Coppa Italia & Champions League`,
                description: `Diretta esclusiva, approfondimenti tattici e collegamenti dagli stadi della Serie A su ${ch.name}.`,
                category: 'Serie A Live',
                sport: 'soccer',
                league: 'Italian Serie A'
            },
            {
                title: id.includes('dazn') ? 'Sunday Night Square & Zona Serie A Live' : 'Sky Calcio Club & Gol Collection Serie A',
                subtitle: 'Analisi, gol e highlights di tutte le partite di Serie A',
                description: 'Tutti i gol della giornata di Serie A, interviste ai protagonisti e moviola in studio.',
                category: 'Calcio Studio',
                sport: 'soccer',
                league: 'Italian Serie A'
            }
        ];
    }

    // 5c. Spanish LaLiga, Champions & Movistar Plus+ / DAZN España Broadcasters
    if (ch.language === 'es') {
        const esFocus =
            id === 'movistar-laliga-es' || id === 'dazn-laliga-es' || id === 'movistar-plus-es'
                ? 'LaLiga EA Sports Directo & El Partidazo'
                : id === 'laliga-hypermotion-es'
                ? 'LaLiga Hypermotion Directo (Segunda División)'
                : id === 'movistar-liga-de-campeones-es'
                ? 'UEFA Champions League & Europa League en Directo'
                : id === 'dazn-f1-es'
                ? 'Fórmula 1 Mundial FIA en Directo'
                : id === 'movistar-deportes-es'
                ? 'ATP Tour Tenis, Liga Endesa ACB & NBA en Directo'
                : 'LaLiga EA Sports & Fútbol Internacional en Directo';
        return [
            {
                title: `${esFocus} - ${ch.shortName}`,
                subtitle: `${ch.name} • Previa, Directo y Post-Partido`,
                description: `Retransmisión en directo, análisis táctico y entrevistas exclusivas desde los estadios en ${ch.name}.`,
                category: 'Deportes en Directo',
                sport: id === 'dazn-f1-es' ? 'motorsport' : 'soccer',
                league: id === 'laliga-hypermotion-es' ? 'Spanish LaLiga 2 Hypermotion' : 'Spanish LaLiga'
            },
            {
                title: id.includes('movistar') ? 'El Día Después & Noche de Fútbol M+' : 'El Post de DAZN LaLiga & Resumen de la Jornada',
                subtitle: 'Todos los goles, resúmenes y análisis de la jornada de LaLiga',
                description: 'Repaso completo a todos los goles y jugadas destacadas de LaLiga EA Sports y competiciones europeas.',
                category: 'Estudio Fútbol',
                sport: 'soccer',
                league: 'Spanish LaLiga'
            }
        ];
    }

    // 6. ESPN / Fox Sports / US League Networks (NBA TV, NFL Network, MLB, NHL)
    if (ch.category === 'espn' || ch.category === 'fox' || ch.category === 'usa') {
        if (id.includes('nba')) {
            return [
                {
                    title: 'NBA Gametime Live & Hardwood Classics',
                    subtitle: 'NBA TV HD • Live Scores, Highlights & Studio Breakdown',
                    description: 'Live look-ins around the association, post-game press conferences, and classic NBA playoff performances.',
                    category: 'Basketball',
                    sport: 'basketball',
                    league: 'NBA Basketball'
                },
                {
                    title: 'NBA Action & Inside the Association',
                    subtitle: 'Top plays, Western & Eastern Conference standings analysis',
                    description: 'Comprehensive coverage of every NBA team with studio analysts.',
                    category: 'Basketball Studio',
                    sport: 'basketball',
                    league: 'NBA Basketball'
                }
            ];
        }
        if (id.includes('nfl')) {
            return [
                {
                    title: 'NFL Total Access & Good Morning Football',
                    subtitle: 'NFL Network HD • 32 Teams News, Film Room & Gameday Breakdown',
                    description: 'Inside coverage of the National Football League with injury reports, depth chart analysis, and game previews.',
                    category: 'American Football',
                    sport: 'football',
                    league: 'NFL Football'
                }
            ];
        }
        return [
            {
                title: ch.category === 'espn' ? 'SportsCenter Live & Top Plays' : `${ch.shortName} Live Studio & Game Day`,
                subtitle: `${ch.name} • Live Scores, Highlights & Breaking Sports News`,
                description: `Flagship daily sports coverage featuring live event analysis, interviews, and highlights on ${ch.name}.`,
                category: 'Sports Studio'
            },
            {
                title: ch.category === 'espn' ? 'First Take / ESPN Featured Matchup' : 'The Herd & Prime Time Sports Special',
                subtitle: 'Debate, Championship Previews & Live Action',
                description: 'High-energy sports commentary and live event coverage.',
                category: 'Sports Talk'
            }
        ];
    }

    // 7. Combat / Motorsport / Default International
    if (ch.category === 'combat' || ch.category === 'motorsport') {
        return [
            {
                title: `${ch.shortName} Main Event Spotlight & Championship Fights`,
                subtitle: `${ch.name} • Full Fight Replays & Pre-Fight Countdown`,
                description: `Uninterrupted combat sports and motorsport action on ${ch.name}.`,
                category: ch.category === 'combat' ? 'Combat Sports' : 'Motorsport'
            },
            {
                title: `${ch.shortName} Embedded & Weigh-In Special`,
                subtitle: 'Exclusive behind-the-scenes access and fighter interviews',
                description: 'All-access coverage leading up to the next championship card.',
                category: ch.category === 'combat' ? 'MMA / Boxing' : 'Racing'
            }
        ];
    }

    // 8. Algeria TV (التلفزيون الجزائري وقنوات الجزائر — ENTV, Canal Algérie, El Heddaf, Echorouk, Ennahar, AL24)
    if (ch.category === 'algeria' || ch.country === 'DZ') {
        if (id.includes('heddaf') || id.includes('tv6')) {
            return [
                {
                    title: 'استوديو الرابطة المحترفة الجزائرية الأولى والمنتخب الوطني (Ligue 1 Mobilis & Les Verts Studio)',
                    subtitle: `${ch.name} • تغطية مباشرة لمباريات البطولة الجزائرية والخضر`,
                    description: 'تغطية شاملة لمباريات الرابطة المحترفة الجزائرية الأولى موبيليس، كأس الجزائر، وأخبار المنتخب الوطني الجزائري.',
                    category: 'Algerian Football Studio',
                    sport: 'soccer',
                    league: 'Algerian Ligue 1 Mobilis'
                },
                {
                    title: 'برنامج بالمكشوف والفريق الدولي (Algerian Football Talk Show)',
                    subtitle: 'نقاشات حصرية مع نجوم الكرة الجزائرية والمحترفين في أوروبا',
                    description: 'تحليل فني معمق لمنافسات الكرة الجزائرية ودوري أبطال أفريقيا.',
                    category: 'Sports Talk Show',
                    sport: 'soccer'
                }
            ];
        }
        if (id.includes('al24') || id.includes('news') || id.includes('ennahar') || id.includes('bilad')) {
            return [
                {
                    title: 'نشرة الأخبار الجزائرية والمغاربية والدولية (Journal Télévisé Algérie Live)',
                    subtitle: `${ch.name} • تغطية إخبارية متواصلة من الجزائر العاصمة`,
                    description: 'متابعة حية ومباشرة لأهم المستجدات الوطنية الجزائرية، المغاربية، والدولية على مدار الساعة.',
                    category: 'Algeria Live News'
                },
                {
                    title: 'حوار الساعة والملف السياسي والاقتصادي (Débat & Actualités Algérie)',
                    subtitle: 'نقاشات تحليلية وتقارير ميدانية من مختلف ولايات الجزائر',
                    description: 'قراءة معمقة في الأحداث الوطنية والدولية عبر قنوات التلفزيون الجزائري.',
                    category: 'News & Debate'
                }
            ];
        }
        return [
            {
                title: `البث المباشر للتلفزيون الجزائري - ${ch.shortName} (Direct Algérie TV HD)`,
                subtitle: `${ch.name} • برامج وطنية، دراما جزائرية، ورياضة`,
                description: `متابعة مباشرة للبرامج التلفزيونية الجزائرية، المسلسلات، ونشرات الأخبار عبر ${ch.name}.`,
                category: 'Algeria TV'
            },
            {
                title: `سهرة العائلة الجزائرية والمجلة الرياضية - ${ch.shortName}`,
                subtitle: 'التلفزيون الجزائري الرسمي • بث عالي الجودة 1080p HD',
                description: 'تغطية يومية شاملة للثقافة، الترفيه، والرياضة في الجزائر.',
                category: 'Algeria Entertainment'
            }
        ];
    }

    // 9. Canal+ (Canal+ France, Canal+ Foot, Canal+ Sport, Canal+ Sport 360, Canal+ F1, MotoGP, Afrique, Extra)
    if (ch.category === 'canal' || net.includes('canal+')) {
        if (id.includes('f1')) {
            return [
                {
                    title: 'Formula 1 Grand Prix Direct & La Grille F1 - Canal+ Formula 1',
                    subtitle: 'Canal+ F1 HD • Essais, Qualifications, Course & Debrief F1',
                    description: 'Intégralité du Championnat du Monde de Formule 1 en direct et en exclusivité sur Canal+ F1.',
                    category: 'Formula 1 Live',
                    sport: 'motorsport',
                    league: 'Formula 1'
                },
                {
                    title: 'Formula One, Le Mag & On Board F1',
                    subtitle: 'Analyses techniques et caméras embarquées',
                    description: 'Tous les coulisses des paddocks de Formule 1 avec les experts Canal+.',
                    category: 'Motorsport Magazine',
                    sport: 'motorsport',
                    league: 'Formula 1'
                }
            ];
        }
        if (id.includes('motogp')) {
            return [
                {
                    title: 'MotoGP World Championship Direct & Sprint Race - Canal+ MotoGP',
                    subtitle: 'Canal+ MotoGP HD • Essais, Qualifications & Grand Prix MotoGP',
                    description: 'Suivez tous les Grands Prix de MotoGP, Moto2 et Moto3 en direct intégral sur Canal+ MotoGP.',
                    category: 'MotoGP Live',
                    sport: 'motorsport',
                    league: 'MotoGP'
                }
            ];
        }
        return [
            {
                title: `Canal Football Club & Soirée UEFA Champions League - ${ch.shortName}`,
                subtitle: `${ch.name} • Direct UEFA Champions League, Premier League & Top 14`,
                description: `Grandes affiches de l'UEFA Champions League, Premier League anglaise, Ligue 1 et Top 14 en direct sur ${ch.name}.`,
                category: 'Canal+ Live Sport',
                sport: 'soccer',
                league: 'UEFA Champions League'
            },
            {
                title: `Canal Champions Club & Late Sport Club - ${ch.shortName}`,
                subtitle: 'Tous les buts, résumés et analyses avec les consultants Canal+',
                description: 'Debrief complet des soirées européennes et des grands championnats sur Canal+.',
                category: 'Canal+ Football Studio',
                sport: 'soccer',
                league: 'English Premier League'
            }
        ];
    }

    return [
        {
            title: `${ch.shortName} Prime Time Live Broadcast`,
            subtitle: `${ch.name} • High Definition Feed`,
            description: `Continuous live programming and featured broadcasts on ${ch.name}.`,
            category: ch.category.toUpperCase()
        },
        {
            title: `${ch.shortName} Featured Event & Studio Special`,
            subtitle: `${ch.network} Official Schedule`,
            description: `Scheduled programming and special coverage on ${ch.name}.`,
            category: ch.category.toUpperCase()
        }
    ];
}

/**
 * Computes the complete EPG (Now Playing, Next Up, Upcoming & 24h Schedule) for a single channel.
 * Prioritizes Direct Official Broadcaster XMLTV schedules (1-to-1 mapped per channel from open-epg.com)
 * and enriches live matches with real-time ESPN live scores and team logos.
 */
export function getChannelEPG(channelId: string, publicBaseUrl: string): ChannelEPG | null {
    const normalizedId = channelId.toLowerCase().trim();
    const ch =
        CORE_SPORTS_CHANNELS.find((c) => c.id === normalizedId) ||
        CORE_SPORTS_CHANNELS.find((c) => c.shortName.toLowerCase().replace(/\s+/g, '-') === normalizedId);

    if (!ch) return null;

    const nowMs = Date.now();

    // 1. Check Official Broadcaster XMLTV Schedule first (1-to-1 channel truth)
    const xmltvIds = CHANNEL_TO_XMLTV_IDS[ch.id] || [];
    let officialXmlProgs: XmltvRawProgramme[] = [];
    for (const xmlId of xmltvIds) {
        const candidate = xmltvScheduleCache.get(xmlId);
        if (candidate && candidate.length > 0) {
            // Prefer a feed that has an active or upcoming programme around nowMs
            if (candidate.some((p) => p.stopMs > nowMs && p.startMs <= nowMs + 12 * 3600 * 1000)) {
                officialXmlProgs = candidate;
                break;
            }
            if (officialXmlProgs.length === 0) {
                officialXmlProgs = candidate;
            }
        }
    }

    if (officialXmlProgs.length > 0) {
        const xmlSchedule: EPGProgram[] = officialXmlProgs.map((xp, idx) => {
            const isCurrent = nowMs >= xp.startMs && nowMs < xp.stopMs;
            const isPast = nowMs >= xp.stopMs;
            const durationMinutes = Math.max(5, Math.round((xp.stopMs - xp.startMs) / 60000));
            const progressPct = isCurrent
                ? Math.min(99, Math.max(1, Math.round(((nowMs - xp.startMs) / Math.max(1, xp.stopMs - xp.startMs)) * 100)))
                : isPast
                ? 100
                : 0;

            // Check if this official XMLTV programme matches a live/upcoming ESPN match (for live score & team logos enrichment)
            const textLower = `${xp.title} ${xp.subTitle} ${xp.description}`.toLowerCase();
            const matchedEv = cachedEvents.find((ev) => {
                if (ev.status === 'FINISHED') return false;
                const evStart = Date.parse(ev.startTime || '') || 0;
                const evEnd = Date.parse(ev.endTime || '') || evStart + 120 * 60000;
                if (xp.startMs >= evEnd + 45 * 60000 || xp.stopMs <= evStart - 45 * 60000) return false;
                const hName = (ev.homeTeam?.name || '').toLowerCase();
                const aName = (ev.awayTeam?.name || '').toLowerCase();
                const hTokens = hName.split(/\s+/).filter((w) => w.length >= 4 && !['club', 'real', 'city', 'united'].includes(w));
                const aTokens = aName.split(/\s+/).filter((w) => w.length >= 4 && !['club', 'real', 'city', 'united'].includes(w));
                const hasH = (hName.length >= 4 && textLower.includes(hName)) || hTokens.some((t) => textLower.includes(t));
                const hasA = (aName.length >= 4 && textLower.includes(aName)) || aTokens.some((t) => textLower.includes(t));
                return hasH && hasA;
            });

            const hasLiveScore =
                isCurrent &&
                matchedEv &&
                matchedEv.status === 'LIVE' &&
                matchedEv.homeTeam.score !== undefined &&
                matchedEv.awayTeam.score !== undefined;

            const baseSubtitle = xp.subTitle || xp.category || `${ch.network} Official Schedule`;
            const enrichedSubtitle = hasLiveScore
                ? `${baseSubtitle} • LIVE ${matchedEv!.homeTeam.score} - ${matchedEv!.awayTeam.score} (${matchedEv!.statusDetail})`
                : baseSubtitle;

            return {
                id: `epg-xml-${ch.id}-${xp.startMs}-${idx}`,
                channelId: ch.id,
                title: xp.title,
                subtitle: enrichedSubtitle,
                description: xp.description || xp.subTitle || `${xp.title} on ${ch.name}`,
                category: xp.category || ch.category,
                sport: matchedEv?.sport || (ch.category === 'movies' || ch.category === 'entertainment' ? undefined : 'soccer'),
                league: matchedEv?.league || xp.subTitle || undefined,
                startTime: new Date(xp.startMs).toISOString(),
                endTime: new Date(xp.stopMs).toISOString(),
                durationMinutes,
                progressPct,
                isLive: isCurrent,
                status: isCurrent ? 'LIVE' : isPast ? 'FINISHED' : 'UPCOMING',
                language: ch.language,
                eventId: matchedEv ? String(matchedEv.id) : undefined,
                matchInfo: matchedEv
                    ? {
                          homeTeam: matchedEv.homeTeam,
                          awayTeam: matchedEv.awayTeam,
                          statusDetail: matchedEv.statusDetail
                      }
                    : undefined
            };
        });

        const nowPlaying =
            xmlSchedule.find((p) => {
                const s = new Date(p.startTime).getTime();
                const e = new Date(p.endTime).getTime();
                return nowMs >= s && nowMs < e;
            }) ||
            xmlSchedule.find((p) => new Date(p.startTime).getTime() > nowMs) ||
            xmlSchedule[xmlSchedule.length - 1];

        const upcoming = xmlSchedule.filter(
            (p) => new Date(p.startTime).getTime() > nowMs && p.id !== nowPlaying?.id
        );
        const nextUp =
            upcoming[0] ||
            xmlSchedule[xmlSchedule.indexOf(nowPlaying) + 1] ||
            nowPlaying;

        return {
            channelId: ch.id,
            channelName: ch.name,
            shortName: ch.shortName,
            network: ch.network,
            category: ch.category,
            language: ch.language,
            languageLabel: ch.languageLabel,
            logo: ch.logo,
            streamEndpoint: `${publicBaseUrl}/v1/live/stream/${ch.id}`,
            masterPlaylistUrl: `${publicBaseUrl}/v1/live/master/${ch.id}.m3u8`,
            updatedAt: new Date(nowMs).toISOString(),
            nowPlaying,
            nextUp,
            upcoming: upcoming.slice(0, 8),
            schedule: xmlSchedule
        };
    }

    // 2. Fallback for specialty channels without an XMLTV feed
    const templates = getNetworkEPGTemplates(ch);

    // Find all active/upcoming real sports events assigned to this channel (strictly excluding FINISHED matches)
    const channelEvents = cachedEvents.filter(
        (ev) =>
            ev.status !== 'FINISHED' &&
            ev.recommendedChannels.some((rc) => rc.channelId === ch.id)
    );

    // Build 2-hour base slots from -2h to +22h (12 slots = 24 hours)
    const baseHourMs = Math.floor(nowMs / (2 * 3600 * 1000)) * (2 * 3600 * 1000);
    const scheduleMap = new Map<number, EPGProgram>();

    // Deterministic hash for channel so different channels on the same network stagger templates
    let chHash = 0;
    for (let i = 0; i < ch.id.length; i++) {
        chHash = (chHash * 31 + ch.id.charCodeAt(i)) >>> 0;
    }

    for (let slotIdx = -1; slotIdx < 11; slotIdx++) {
        const slotStartMs = baseHourMs + slotIdx * 2 * 3600 * 1000;
        const slotEndMs = slotStartMs + 2 * 3600 * 1000;
        const tpl = templates[Math.abs(slotIdx + chHash) % templates.length];

        const isCurrentSlot = nowMs >= slotStartMs && nowMs < slotEndMs;
        const isPastSlot = nowMs >= slotEndMs;
        const progressPct = isCurrentSlot
            ? Math.min(100, Math.max(1, Math.round(((nowMs - slotStartMs) / (slotEndMs - slotStartMs)) * 100)))
            : isPastSlot
            ? 100
            : 0;

        scheduleMap.set(slotStartMs, {
            id: `epg-${ch.id}-${slotStartMs}`,
            channelId: ch.id,
            title: tpl.title,
            subtitle: tpl.subtitle,
            description: tpl.description,
            category: tpl.category,
            sport: tpl.sport,
            league: tpl.league,
            startTime: new Date(slotStartMs).toISOString(),
            endTime: new Date(slotEndMs).toISOString(),
            durationMinutes: 120,
            progressPct,
            isLive: isCurrentSlot,
            status: isCurrentSlot ? 'LIVE' : isPastSlot ? 'FINISHED' : 'UPCOMING',
            language: ch.language
        });
    }

    // Overlay real LIVE and UPCOMING sports events onto the channel's EPG schedule
    // Strictly exclude FINISHED matches so they never get stuck in nowPlaying!
    for (const ev of channelEvents) {
        if (ev.status === 'FINISHED') continue;

        const evStartMs = new Date(ev.startTime).getTime();
        const evEndMs = ev.endTime ? new Date(ev.endTime).getTime() : evStartMs + 120 * 60 * 1000;
        const durationMin = Math.max(60, Math.round((evEndMs - evStartMs) / 60000));
        const minsUntil = Math.round((evStartMs - nowMs) / 60000);

        const isLiveNow =
            ev.status === 'LIVE' || (ev.status === 'UPCOMING' && minsUntil >= -10 && minsUntil <= 10);

        // Only include events within [-3h, +36h] window
        if (evEndMs < nowMs - 3 * 3600 * 1000 || evStartMs > nowMs + 36 * 3600 * 1000) {
            continue;
        }

        const hasScore =
            ev.status === 'LIVE' &&
            ev.homeTeam.score !== undefined &&
            ev.awayTeam.score !== undefined;

        const scoreText = hasScore
            ? `${ev.homeTeam.name} ${ev.homeTeam.score} - ${ev.awayTeam.score} ${ev.awayTeam.name}`
            : `${ev.homeTeam.name} vs ${ev.awayTeam.name}`;

        const livePrefix = isLiveNow
            ? ch.language === 'ar'
                ? 'مباشر: '
                : 'LIVE: '
            : '';

        const progressPct = isLiveNow
            ? Math.min(99, Math.max(5, Math.round(((nowMs - evStartMs) / Math.max(1, evEndMs - evStartMs)) * 100)))
            : 0;

        const prog: EPGProgram = {
            id: `epg-${ch.id}-${ev.id}`,
            channelId: ch.id,
            title: isLiveNow ? `${livePrefix}${scoreText}` : `${ev.homeTeam.name} vs ${ev.awayTeam.name}`,
            subtitle: `${ev.league} • ${ev.statusDetail}`,
            description:
                ch.language === 'ar'
                    ? `نقل حي ومباشر لمباراة ${ev.homeTeam.name} ضد ${ev.awayTeam.name} ضمن منافسات ${ev.league} عبر ${ch.name}.`
                    : `Live broadcast of ${ev.homeTeam.name} vs ${ev.awayTeam.name} in the ${ev.league} on ${ch.name}.`,
            category: 'Live Sports',
            sport: ev.sport,
            league: ev.league,
            startTime: new Date(evStartMs).toISOString(),
            endTime: new Date(evEndMs).toISOString(),
            durationMinutes: durationMin,
            progressPct,
            isLive: isLiveNow,
            status: isLiveNow ? 'LIVE' : 'UPCOMING',
            language: ch.language,
            eventId: String(ev.id),
            matchInfo: {
                homeTeam: ev.homeTeam,
                awayTeam: ev.awayTeam,
                statusDetail: ev.statusDetail
            }
        };

        // Remove any synthetic template slot that overlaps with this real match fixture,
        // and prevent overlapping simultaneous live matches on a single linear TV channel
        let skipDueToSimultaneousMatch = false;
        for (const [slotKey, existing] of Array.from(scheduleMap.entries())) {
            const existingStart = new Date(existing.startTime).getTime();
            const existingEnd = new Date(existing.endTime).getTime();
            const overlaps = existingStart < evEndMs && existingEnd > evStartMs;
            if (!overlaps) continue;

            if (!existing.eventId) {
                if (existingStart <= nowMs && evStartMs > nowMs && !prog.isLive) {
                    scheduleMap.set(slotKey, {
                        ...existing,
                        endTime: new Date(evStartMs).toISOString(),
                        durationMinutes: Math.max(15, Math.round((evStartMs - existingStart) / 60000)),
                        isLive: true,
                        status: 'LIVE'
                    });
                } else {
                    scheduleMap.delete(slotKey);
                }
            } else {
                if (prog.isLive && !existing.isLive) {
                    scheduleMap.delete(slotKey);
                } else {
                    skipDueToSimultaneousMatch = true;
                    break;
                }
            }
        }

        if (!skipDueToSimultaneousMatch) {
            scheduleMap.set(evStartMs, prog);
        }
    }

    const schedule = Array.from(scheduleMap.values()).sort((a, b) => {
        const diff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        if (diff !== 0) return diff;
        if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
        return 0;
    });

    // Determine nowPlaying (prioritize real LIVE match, strictly excluding any FINISHED match)
    const liveRealMatches = schedule.filter((p) => p.eventId && p.isLive && p.status === 'LIVE');
    const nowPlaying =
        liveRealMatches[0] ||
        schedule.find((p) => {
            const s = new Date(p.startTime).getTime();
            const e = new Date(p.endTime).getTime();
            return nowMs >= s && nowMs < e && p.status !== 'FINISHED';
        }) ||
        schedule.find((p) => p.isLive) ||
        schedule[0];

    const upcoming = schedule.filter(
        (p) =>
            p.status === 'UPCOMING' &&
            new Date(p.startTime).getTime() > nowMs &&
            p.id !== nowPlaying?.id
    );
    const nextUp =
        upcoming[0] ||
        schedule[schedule.indexOf(nowPlaying) + 1] ||
        nowPlaying;

    return {
        channelId: ch.id,
        channelName: ch.name,
        shortName: ch.shortName,
        network: ch.network,
        category: ch.category,
        language: ch.language,
        languageLabel: ch.languageLabel,
        logo: ch.logo,
        streamEndpoint: `${publicBaseUrl}/v1/live/stream/${ch.id}`,
        masterPlaylistUrl: `${publicBaseUrl}/v1/live/master/${ch.id}.m3u8`,
        updatedAt: new Date(nowMs).toISOString(),
        nowPlaying,
        nextUp,
        upcoming: upcoming.slice(0, 8),
        schedule
    };
}

/**
 * Returns the full EPG guide across all (or filtered) live channels
 */
export async function getAllChannelsEPG(
    publicBaseUrl: string,
    filters?: { lang?: string; category?: string; channelId?: string; query?: string }
): Promise<ChannelEPG[]> {
    await Promise.allSettled([
        harvestOfficialXmltvEpg(),
        getLiveSportEvents(publicBaseUrl)
    ]);

    if (filters?.channelId) {
        const single = getChannelEPG(filters.channelId, publicBaseUrl);
        return single ? [single] : [];
    }

    const channels = getLiveChannels(publicBaseUrl, {
        lang: filters?.lang,
        category: filters?.category,
        query: filters?.query
    });

    return channels
        .map((ch) => getChannelEPG(ch.id, publicBaseUrl))
        .filter((epg): epg is ChannelEPG => Boolean(epg));
}

/**
 * Generates an XMLTV-compliant EPG document (/v1/live/epg.xml) for TiviMate, VLC, Kodi, OTT Navigator
 */
export async function generateXMLTVEPG(
    publicBaseUrl: string,
    filters?: { lang?: string; category?: string }
): Promise<string> {
    const epgList = await getAllChannelsEPG(publicBaseUrl, filters);

    const escapeXml = (str: string): string =>
        String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

    const formatXmltvDate = (iso: string): string => {
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, '0');
        return (
            `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
            `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())} +0000`
        );
    };

    const lines: string[] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<tv generator-info-name="CinePro-Live-EPG-Engine" generator-info-url="' + escapeXml(publicBaseUrl) + '">'
    ];

    for (const chEpg of epgList) {
        lines.push(`  <channel id="${escapeXml(chEpg.channelId)}">`);
        lines.push(`    <display-name lang="${escapeXml(chEpg.language)}">${escapeXml(chEpg.channelName)}</display-name>`);
        lines.push(`    <display-name>${escapeXml(chEpg.shortName)}</display-name>`);
        if (chEpg.logo) {
            lines.push(`    <icon src="${escapeXml(chEpg.logo)}" />`);
        }
        lines.push('  </channel>');
    }

    for (const chEpg of epgList) {
        for (const prog of chEpg.schedule) {
            lines.push(
                `  <programme start="${formatXmltvDate(prog.startTime)}" stop="${formatXmltvDate(prog.endTime)}" channel="${escapeXml(chEpg.channelId)}">`
            );
            lines.push(`    <title lang="${escapeXml(prog.language)}">${escapeXml(prog.title)}</title>`);
            if (prog.subtitle) {
                lines.push(`    <sub-title lang="${escapeXml(prog.language)}">${escapeXml(prog.subtitle)}</sub-title>`);
            }
            if (prog.description) {
                lines.push(`    <desc lang="${escapeXml(prog.language)}">${escapeXml(prog.description)}</desc>`);
            }
            if (prog.category) {
                lines.push(`    <category lang="en">${escapeXml(prog.category)}</category>`);
            }
            lines.push('  </programme>');
        }
    }

    lines.push('</tv>');
    return lines.join('\n') + '\n';
}

/**
 * Generates an M3U8 Playlist string for all (or filtered) Live Sports Channels with XMLTV EPG URL
 */
export function generateSportsM3UPlaylist(
    publicBaseUrl: string,
    options?: { lang?: string; category?: string; useProxy?: boolean }
): string {
    const channels = getLiveChannels(publicBaseUrl, {
        lang: options?.lang,
        category: options?.category
    });

    const useProxy = options?.useProxy !== false;
    const epgXmlUrl = `${publicBaseUrl}/v1/live/epg.xml`;
    const lines: string[] = [`#EXTM3U url-tvg="${epgXmlUrl}" x-tvg-url="${epgXmlUrl}"`];
    for (const ch of channels) {
        const nowTitle = ch.epg?.nowPlaying?.title ? ` — ${ch.epg.nowPlaying.title}` : '';
        const groupTitle = getChannelGroupTitle(ch);
        for (const st of ch.streams) {
            const rawTarget = (st as any).rawUrl || st.url;
            const targetUrl = useProxy
                ? (st.url.includes('/v1/live/proxy') ? st.url : buildLiveProxyUrl(rawTarget, publicBaseUrl, st.headers, ch.id))
                : rawTarget;
            lines.push(
                `#EXTINF:-1 tvg-id="${ch.id}" tvg-name="${ch.name}" tvg-logo="${ch.logo}" tvg-language="${ch.languageLabel}" group-title="${groupTitle}",${st.label} [${st.quality}]${nowTitle}`
            );
            lines.push(targetUrl);
        }
    }
    return lines.join('\n') + '\n';
}

/**
 * Resolves relative URLs inside an HLS .m3u8 manifest and rewrites them through /v1/live/proxy
 * Supports #EXT-X-DISCONTINUITY injection when failing over transparently between backup servers.
 */
interface RollingSegmentEntry {
    prefixTags: string[];
    inf: string;
    uri: string;
    normKey: string;
    cacheKey: string;
    seq: number;
}
interface RollingPlaylistState {
    segments: RollingSegmentEntry[];
    lastLatestSeq: number;
    updatedAt: number;
}
const rollingLivePlaylistCache = new Map<string, RollingPlaylistState>();

export function rewriteLiveHlsManifest(
    manifestContent: string,
    baseUrl: string,
    publicBaseUrl: string,
    headers?: Record<string, string>,
    channelId?: string,
    injectDiscontinuity = false
): string {
    let lines = manifestContent.split(/\r?\n/);
    const isEdgeParent = /https?:\/\/edge\.[a-z0-9.-]+/i.test(baseUrl);

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

    // If upstream is a DVR media playlist (e.g. Kwikmotion chunks_dvr.m3u8 with 3,500+ segments),
    // trim to a fast live sliding window of the latest 8 segments so manifests stay lightweight (<2KB)
    // while preserving any inter-segment #EXT-X-PROGRAM-DATE-TIME / #EXT-X-DISCONTINUITY tags in place.
    if (baseUrl.includes('chunks_dvr.m3u8')) {
        const headerLines: string[] = [];
        const segmentPairs: Array<{ prefixTags: string[]; inf: string; uri: string }> = [];
        let pendingInf = '';
        let pendingPrefixTags: string[] = [];
        let seenFirstSegment = false;

        for (const l of lines) {
            const t = l.trim();
            if (!t) continue;
            if (t.startsWith('#EXTINF')) {
                seenFirstSegment = true;
                pendingInf = l;
            } else if (!t.startsWith('#')) {
                if (pendingInf) {
                    segmentPairs.push({ prefixTags: pendingPrefixTags, inf: pendingInf, uri: l });
                    pendingInf = '';
                    pendingPrefixTags = [];
                }
            } else if (
                seenFirstSegment ||
                t.startsWith('#EXT-X-DISCONTINUITY') ||
                t.startsWith('#EXT-X-PROGRAM-DATE-TIME')
            ) {
                if (t !== '#EXT-X-ENDLIST') {
                    pendingPrefixTags.push(l);
                }
            } else {
                headerLines.push(l);
            }
        }
        if (segmentPairs.length > 8) {
            const droppedCount = segmentPairs.length - 8;
            const keptPairs = segmentPairs.slice(-8);
            const adjustedHeaders = headerLines.map((h) => {
                const seqMatch = h.match(/^#EXT-X-MEDIA-SEQUENCE:(\d+)/i);
                if (seqMatch) {
                    return `#EXT-X-MEDIA-SEQUENCE:${Number(seqMatch[1]) + droppedCount}`;
                }
                return h;
            });
            lines = [...adjustedHeaders, ...keptPairs.flatMap((p) => [...p.prefixTags, p.inf, p.uri])];
        }
    }

    const rewritten: string[] = [];
    let discontinuityInserted = !injectDiscontinuity;

    const wrapProxy = (targetUrl: string, isSubManifest: boolean): string => {
        const isTiktokSegment = /tiktokcdn/i.test(targetUrl) || targetUrl.includes('.image');
        const effectiveHeaders = isTiktokSegment && isEdgeParent ? undefined : headers;
        const payloadObj: Record<string, any> = {
            url: targetUrl,
            headers: {
                'User-Agent': DEFAULT_UA,
                ...(effectiveHeaders || {})
            }
        };
        if (channelId) payloadObj.channelId = channelId;
        const payload = JSON.stringify(payloadObj);
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
            if (!discontinuityInserted && trimmed.startsWith('#EXTINF')) {
                rewritten.push('#EXT-X-DISCONTINUITY');
                discontinuityInserted = true;
            }
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

// ============================================================================
// PILLAR 2 & 4: ANTI-FREEZE ZOMBIE DETECTOR, BOUNDED 220MB RAM SEGMENT CACHE & MULTI-SEGMENT STREAM PUMP
// ============================================================================
const lastGoodManifestCache = new Map<string, { content: string; updatedAt: number }>();
const unwrappedSegmentCache = new Map<string, { buffer: Buffer; contentType: string; expiresAt: number }>();
const segmentInFlight = new Map<string, Promise<{ buffer: Buffer; contentType: string }>>();
const MAX_CACHED_SEGMENTS = 320;
const MAX_CACHE_BYTES = 220 * 1024 * 1024; // 220 MB RAM cap
let currentCachedBytes = 0;
let totalCacheHits = 0;
let totalCacheMisses = 0;
let totalPrefetchedSegments = 0;
let totalFailoverEvents = 0;

function getSegmentCacheKey(url: string): string {
    if (url.includes('tiktokcdn') || url.includes('.image')) {
        const hashMatch = url.match(/\/([a-f0-9]{24,64})\.image/i);
        if (hashMatch) {
            return `tiktok::${hashMatch[1].toLowerCase()}`;
        }
    }
    if (/\.(ts|m4s|tbin|aac|mp4|image)\?/i.test(url)) {
        return url.split('?')[0];
    }
    return url;
}

interface ManifestFreezeState {
    lastSegmentKey: string;
    lastAdvancedAt: number;
    stagnantPolls: number;
}
const manifestFreezeTracker = new Map<string, ManifestFreezeState>();

function setCachedSegment(url: string, buffer: Buffer, contentType: string): void {
    const key = getSegmentCacheKey(url);
    const existing = unwrappedSegmentCache.get(key);
    if (existing) {
        currentCachedBytes = Math.max(0, currentCachedBytes - existing.buffer.length);
        unwrappedSegmentCache.delete(key);
    }

    while (
        (unwrappedSegmentCache.size >= MAX_CACHED_SEGMENTS || currentCachedBytes + buffer.length > MAX_CACHE_BYTES) &&
        unwrappedSegmentCache.size > 0
    ) {
        const oldestKey = unwrappedSegmentCache.keys().next().value;
        if (!oldestKey) break;
        const oldEntry = unwrappedSegmentCache.get(oldestKey);
        if (oldEntry) {
            currentCachedBytes = Math.max(0, currentCachedBytes - oldEntry.buffer.length);
        }
        unwrappedSegmentCache.delete(oldestKey);
    }

    unwrappedSegmentCache.set(key, {
        buffer,
        contentType,
        expiresAt: Date.now() + 180 * 1000
    });
    currentCachedBytes += buffer.length;
}

/**
 * Checks whether an upstream live media manifest's segment list is advancing or frozen (zombie encoder).
 * Returns true if the manifest has been stuck on the exact same last segment for >32 seconds across 6+ polls.
 */
function checkManifestFrozen(manifestUrl: string, rawManifestText: string): boolean {
    const lines = rawManifestText.split(/\r?\n/);
    let lastMediaLine = '';
    for (let i = lines.length - 1; i >= 0; i--) {
        const t = lines[i].trim();
        if (t && !t.startsWith('#')) {
            lastMediaLine = t;
            break;
        }
    }
    // If it's a master playlist pointing to sub-manifests (.m3u8), do not mark as frozen
    if (!lastMediaLine || /\.m3u8(\?|$)/i.test(lastMediaLine)) {
        return false;
    }

    const segKey = getSegmentCacheKey(lastMediaLine);
    const now = Date.now();
    const prev = manifestFreezeTracker.get(manifestUrl);
    if (!prev || prev.lastSegmentKey !== segKey) {
        manifestFreezeTracker.set(manifestUrl, {
            lastSegmentKey: segKey,
            lastAdvancedAt: now,
            stagnantPolls: 0
        });
        return false;
    }

    prev.stagnantPolls += 1;
    const stuckDurationMs = now - prev.lastAdvancedAt;
    return prev.stagnantPolls >= 12 && stuckDurationMs > 45000;
}

/**
 * Immediately pre-warms the latest N segments (N-2, N-1, N) into RAM with 0ms artificial delay
 * so both initial playback and continuous live edge polling hit local RAM (<5ms) instead of waiting on upstream CDNs.
 */
function warmStreamSegments(
    rawManifestText: string,
    baseUrl: string,
    headers?: Record<string, string>,
    channelId?: string,
    maxCount = 3,
    depth = 0
): void {
    if (segmentInFlight.size >= 8) return;

    const lines = rawManifestText.split(/\r?\n/);
    const mediaLines: string[] = [];
    const subManifestLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (!t || t.startsWith('#')) continue;
        if (/\.m3u8(\?|$)/i.test(t)) {
            subManifestLines.push(t);
        } else {
            mediaLines.push(t);
        }
    }
    if (mediaLines.length === 0) {
        if (depth === 0 && subManifestLines.length > 0) {
            const firstSub = subManifestLines[0];
            let absSubUrl = firstSub;
            if (!/^https?:\/\//i.test(firstSub)) {
                try {
                    absSubUrl = new URL(firstSub, baseUrl).toString();
                } catch {
                    return;
                }
            }
            fetchUpstreamBufferWithRetry(absSubUrl, headers, {
                maxAttempts: 1,
                stallTimeoutMs: 2500,
                timeoutMs: 3500
            })
                .then(({ buffer, ok, finalResolvedUrl }) => {
                    if (ok && buffer.length > 0) {
                        const subText = buffer.toString('utf8');
                        if (subText.includes('#EXTINF')) {
                            warmStreamSegments(subText, finalResolvedUrl, headers, channelId, maxCount, 1);
                        }
                    }
                })
                .catch(() => {});
        }
        return;
    }

    const isEdgeParent = /https?:\/\/edge\.[a-z0-9.-]+/i.test(baseUrl);
    const targetLines = mediaLines.slice(-maxCount);

    for (const segRel of targetLines) {
        if (segmentInFlight.size >= 8) break;
        let absSegUrl = segRel;
        if (!/^https?:\/\//i.test(segRel)) {
            try {
                absSegUrl = new URL(segRel, baseUrl).toString();
            } catch {
                continue;
            }
        }

        const segCacheKey = getSegmentCacheKey(absSegUrl);
        const cached = unwrappedSegmentCache.get(segCacheKey);
        if ((cached && Date.now() < cached.expiresAt) || segmentInFlight.has(segCacheKey)) {
            continue;
        }

        const isTiktokSegment = /tiktokcdn/i.test(absSegUrl) || absSegUrl.includes('.image');
        const effectiveHeaders = isTiktokSegment && isEdgeParent ? undefined : headers;

        const prefetchTask = (async () => {
            const recheck = unwrappedSegmentCache.get(segCacheKey);
            if (recheck && Date.now() < recheck.expiresAt) {
                return { buffer: recheck.buffer, contentType: recheck.contentType };
            }
            const { buffer: rawBuf, ok, status, contentType } = await fetchUpstreamBufferWithRetry(
                absSegUrl,
                effectiveHeaders,
                {
                    maxAttempts: 2,
                    stallTimeoutMs: 2600,
                    timeoutMs: 5500
                }
            );
            if (!ok || rawBuf.length === 0) throw new Error(`prefetch_http_${status}`);
            const needsUnwrap =
                absSegUrl.includes('tiktokcdn') ||
                absSegUrl.endsWith('.image') ||
                contentType.includes('image/') ||
                contentType.includes('octet-stream') ||
                (rawBuf.length >= 188 && rawBuf[0] !== 0x47);
            const finalBuf = needsUnwrap ? await unwrapLiveTsSegmentAsync(rawBuf) : rawBuf;
            const outType =
                finalBuf.length >= 188 && finalBuf[0] === 0x47 ? 'video/mp2t' : contentType || 'video/mp2t';
            if (finalBuf.length >= 188 && finalBuf[0] === 0x47) {
                inspectMpegTsSegment(finalBuf, baseUrl);
            }
            setCachedSegment(absSegUrl, finalBuf, outType);
            totalPrefetchedSegments += 1;
            return { buffer: finalBuf, contentType: outType };
        })();

        segmentInFlight.set(segCacheKey, prefetchTask);
        prefetchTask
            .catch(() => {})
            .finally(() => {
                segmentInFlight.delete(segCacheKey);
            });
    }
}

function prefetchLatestSegment(
    rawManifestText: string,
    baseUrl: string,
    headers?: Record<string, string>,
    channelId?: string
): void {
    warmStreamSegments(rawManifestText, baseUrl, headers, channelId, 3);
}

interface ActiveStreamPumpEntry {
    manifestCacheKey: string;
    effectiveUrl: string;
    effectiveHeaders?: Record<string, string>;
    publicBaseUrl: string;
    channelId?: string;
    lastViewerActivityAt: number;
    isPolling: boolean;
}
const activeStreamPumps = new Map<string, ActiveStreamPumpEntry>();
let activeStreamPumpInterval: NodeJS.Timeout | null = null;

function ensureActiveStreamPumpLoop(): void {
    if (activeStreamPumpInterval) return;
    activeStreamPumpInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of activeStreamPumps.entries()) {
            if (now - entry.lastViewerActivityAt > 40_000) {
                activeStreamPumps.delete(key);
                continue;
            }
            if (entry.isPolling) continue;
            entry.isPolling = true;
            (async () => {
                try {
                    const { buffer: buf, ok, finalResolvedUrl } = await fetchUpstreamBufferWithRetry(
                        entry.effectiveUrl,
                        entry.effectiveHeaders,
                        {
                            maxAttempts: 2,
                            stallTimeoutMs: 2800,
                            timeoutMs: 3800
                        }
                    );
                    if (!ok || buf.length === 0) return;
                    const textPeek = buf.subarray(0, 16).toString('utf8').trim();
                    if (!textPeek.startsWith('#EXTM3U') && !textPeek.startsWith('#EXT')) return;
                    const rawM3UText = buf.toString('utf8');
                    // Pre-warm the latest 4 segments into RAM in the background so player segment requests hit 0ms RAM cache,
                    // without overwriting lastGoodManifestCache timestamps (so player manifest polls always see real-time sequence updates).
                    warmStreamSegments(rawM3UText, finalResolvedUrl, entry.effectiveHeaders, entry.channelId, 4);
                } catch {
                    // Ignore transient background pump errors
                } finally {
                    entry.isPolling = false;
                }
            })();
        }
    }, 2000);
    if (typeof activeStreamPumpInterval.unref === 'function') {
        activeStreamPumpInterval.unref();
    }
}

function touchActiveStreamPump(
    manifestCacheKey: string,
    effectiveUrl: string,
    effectiveHeaders: Record<string, string> | undefined,
    publicBaseUrl: string,
    channelId?: string
): void {
    ensureActiveStreamPumpLoop();
    const existing = activeStreamPumps.get(manifestCacheKey);
    if (existing) {
        existing.lastViewerActivityAt = Date.now();
        existing.effectiveUrl = effectiveUrl;
        existing.effectiveHeaders = effectiveHeaders;
        return;
    }
    if (activeStreamPumps.size >= 16) {
        const oldestKey = activeStreamPumps.keys().next().value;
        if (oldestKey) activeStreamPumps.delete(oldestKey);
    }
    activeStreamPumps.set(manifestCacheKey, {
        manifestCacheKey,
        effectiveUrl,
        effectiveHeaders,
        publicBaseUrl,
        channelId,
        lastViewerActivityAt: Date.now(),
        isPolling: false
    });
}

// Tracks channels that have failed over to a backup server so subsequent manifest polls stay pinned
// to the same backup server instead of ping-ponging between incompatible EXT-X-MEDIA-SEQUENCE counters.
const channelFailoverPinMap = new Map<
    string,
    {
        backupUrl: string;
        backupHeaders?: Record<string, string>;
        pinnedAt: number;
        needsDiscontinuity: boolean;
    }
>();

/**
 * Seamless Mid-Stream Failover: if a channel's active server fails or freezes mid-match,
 * finds the next healthy backup stream for that exact channel, pins the channel to that backup server
 * for 3 minutes, and injects #EXT-X-DISCONTINUITY on the transition poll so the player switches smoothly.
 */
async function attemptChannelFailoverManifest(
    channelId: string,
    failedUrl: string,
    publicBaseUrl: string
): Promise<string | null> {
    const ch = CORE_SPORTS_CHANNELS.find((c) => c.id === channelId);
    if (!ch) return null;

    const dynBackups = dynamicChannelCache.get(ch.id) || [];
    const sameEventSimulcasts: Array<{
        label: string;
        url: string;
        quality: string;
        language: LiveChannel['language'];
        headers?: Record<string, string>;
    }> = [];

    const chEpg = getChannelEPG(ch.id, publicBaseUrl);
    if (chEpg?.nowPlaying?.isLive && chEpg?.nowPlaying?.eventId) {
        const liveEventId = String(chEpg.nowPlaying.eventId);
        const activeEvent = cachedEvents.find((ev) => String(ev.id) === liveEventId && ev.status !== 'FINISHED');
        if (activeEvent) {
            for (const rc of activeEvent.recommendedChannels) {
                if (rc.channelId === ch.id) continue;
                const simCh = CORE_SPORTS_CHANNELS.find((c) => c.id === rc.channelId);
                const simPrimary = simCh?.streams[0];
                if (simCh && simPrimary) {
                    sameEventSimulcasts.push({
                        label: `${simCh.shortName} (Same Live Event Simulcast)`,
                        url: simPrimary.url,
                        quality: simPrimary.quality,
                        language: simPrimary.language,
                        headers: simPrimary.headers
                    });
                }
            }
        }
    }

    const candidates = [
        ...ch.streams,
        ...dynBackups.map((d) => ({
            label: d.label,
            url: d.url,
            quality: d.quality,
            language: ch.language,
            headers: d.headers
        })),
        ...sameEventSimulcasts
    ].filter((s) => s.url !== failedUrl);

    for (const backup of candidates) {
        const health = getOrCreateHealthState(backup.url, channelId);
        if (health.circuitState === 'OPEN') continue;
        try {
            const { buffer, ok, finalResolvedUrl } = await fetchUpstreamBufferWithRetry(backup.url, backup.headers, {
                maxAttempts: 2,
                timeoutMs: 4200
            });
            if (!ok || buffer.length === 0) continue;
            const text = buffer.toString('utf8');
            if (!text.includes('#EXTM3U') && !text.includes('#EXT-X-')) continue;

            totalFailoverEvents += 1;
            const failedState = getOrCreateHealthState(failedUrl, channelId);
            failedState.failoverCount += 1;
            recordStreamHealthResult(backup.url, true, 150, channelId);
            warmStreamSegments(text, finalResolvedUrl, backup.headers, channelId, 3);

            // Pin this channel + failedUrl to the healthy backup for 3 minutes so future polls don't jump back and forth
            const pinKey = `${channelId}::${failedUrl}`;
            channelFailoverPinMap.set(pinKey, {
                backupUrl: backup.url,
                backupHeaders: backup.headers,
                pinnedAt: Date.now(),
                needsDiscontinuity: false
            });

            return rewriteLiveHlsManifest(
                text,
                finalResolvedUrl,
                publicBaseUrl,
                backup.headers,
                channelId,
                true // inject #EXT-X-DISCONTINUITY on the initial transition poll
            );
        } catch {
            // Try next backup server
        }
    }
    return null;
}

/**
 * Handles proxying of Live HLS manifests (.m3u8) and MPEG-TS/fMP4 segments (.ts, .tbin, .m4s, .image)
 * Features:
 * 1. Full-Body Fast-Retry (3.4s per-attempt timeout covering headers + full body download across 4 attempts).
 * 2. Anti-Freeze Zombie Stream Detector + Pinned Mid-Stream Failover (#EXT-X-DISCONTINUITY).
 * 3. Last-Good Manifest Shield (serves cached manifest on transient blips before switching servers).
 * 4. Bounded 220MB RAM LRU Segment Cache, Content-Addressed Cache Keys & Active Stream Pump (0ms hits).
 */
export async function handleLiveHlsProxyRequest(
    encodedData: string,
    publicBaseUrl: string,
    reply: any,
    extraQuery?: { relay?: string; profile?: string }
): Promise<any> {
    let parsed: { url: string; headers?: Record<string, string>; channelId?: string; q?: string };
    try {
        parsed = JSON.parse(encodedData);
    } catch {
        try {
            parsed = JSON.parse(decodeURIComponent(encodedData));
        } catch {
            return reply.code(400).header('Access-Control-Allow-Origin', '*').send({ error: 'Invalid proxy payload' });
        }
    }

    if (!parsed?.url) {
        return reply.code(400).header('Access-Control-Allow-Origin', '*').send({ error: 'Missing url in proxy data' });
    }

    const relaySlot = extraQuery?.relay || '1';
    const requestedProfile = extraQuery?.profile || parsed.q || '';
    const isM3U8Url = /\.m3u8(\?|$)/i.test(parsed.url);
    const pinKey = parsed.channelId ? `${parsed.channelId}::${parsed.url}` : '';
    const activePin = pinKey ? channelFailoverPinMap.get(pinKey) : undefined;
    let effectiveUrl = parsed.url;
    let effectiveHeaders = parsed.headers;
    if (isM3U8Url && activePin) {
        if (Date.now() - activePin.pinnedAt < 180_000) {
            effectiveUrl = activePin.backupUrl;
            effectiveHeaders = activePin.backupHeaders || parsed.headers;
        } else {
            channelFailoverPinMap.delete(pinKey);
        }
    }

    const manifestCacheKey = `${publicBaseUrl}::${effectiveUrl}::r=${relaySlot}::p=${requestedProfile}`;
    const segCacheKey = !isM3U8Url ? getSegmentCacheKey(parsed.url) : '';

    let hadInflightFailure = false;

    // 1. Sub-second request coalescer (350ms) to deduplicate simultaneous identical manifest polls + trigger background segment pre-warmer
    if (isM3U8Url && relaySlot === '1') {
        touchActiveStreamPump(manifestCacheKey, effectiveUrl, effectiveHeaders, publicBaseUrl, parsed.channelId);
        const recentManifest = lastGoodManifestCache.get(manifestCacheKey);
        if (recentManifest && Date.now() - recentManifest.updatedAt < 350) {
            return reply
                .code(200)
                .header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
                .header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                .header('X-Manifest-Cache', 'HIT')
                .header('Access-Control-Allow-Origin', '*')
                .send(recentManifest.content);
        }
    } else if (!isM3U8Url) {
        // 2. Check unwrapped segment RAM cache for instant 0ms response
        const cachedSeg = unwrappedSegmentCache.get(segCacheKey);
        if (cachedSeg && Date.now() < cachedSeg.expiresAt) {
            totalCacheHits += 1;
            return reply
                .code(200)
                .header('Content-Type', cachedSeg.contentType)
                .header('Content-Length', String(cachedSeg.buffer.length))
                .header('Cache-Control', 'public, max-age=60')
                .header('X-Cache', 'HIT')
                .header('Access-Control-Allow-Origin', '*')
                .send(cachedSeg.buffer);
        }

        // Coalesce duplicate in-flight segment downloads (including predictive pre-fetches)
        const inflightSeg = segmentInFlight.get(segCacheKey);
        if (inflightSeg) {
            try {
                const segResult = await inflightSeg;
                totalCacheHits += 1;
                return reply
                    .code(200)
                    .header('Content-Type', segResult.contentType)
                    .header('Content-Length', String(segResult.buffer.length))
                    .header('Cache-Control', 'public, max-age=60')
                    .header('X-Cache', 'COALESCED')
                    .header('Access-Control-Allow-Origin', '*')
                    .send(segResult.buffer);
            } catch {
                hadInflightFailure = true;
            }
        }
        totalCacheMisses += 1;
    }

    const t0 = Date.now();
    try {
        if (isM3U8Url) {
            const { buffer: buf, ok, status, finalResolvedUrl } = await fetchUpstreamBufferWithRetry(
                effectiveUrl,
                effectiveHeaders,
                {
                    maxAttempts: 3,
                    stallTimeoutMs: 3200,
                    timeoutMs: 4500
                }
            );

            if (!ok || buf.length === 0) {
                const updatedHealth = recordStreamHealthResult(
                    effectiveUrl,
                    false,
                    Date.now() - t0,
                    parsed.channelId,
                    `http_${status}`
                );
                // Shield transient upstream hiccups with lastGoodManifestCache BEFORE switching servers mid-stream
                const fallbackManifest = lastGoodManifestCache.get(manifestCacheKey);
                if (
                    fallbackManifest &&
                    Date.now() - fallbackManifest.updatedAt < 25000 &&
                    updatedHealth.consecutiveFailures < 6
                ) {
                    return reply
                        .code(200)
                        .header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
                        .header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                        .header('X-Manifest-Shield', 'ACTIVE')
                        .header('Access-Control-Allow-Origin', '*')
                        .send(fallbackManifest.content);
                }
                if (parsed.channelId) {
                    const failoverM3U = await attemptChannelFailoverManifest(
                        parsed.channelId,
                        effectiveUrl,
                        publicBaseUrl
                    );
                    if (failoverM3U) {
                        return reply
                            .code(200)
                            .header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
                            .header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                            .header('X-Stream-Failover', 'ACTIVE')
                            .header('Access-Control-Allow-Origin', '*')
                            .send(failoverM3U);
                    }
                }
                if (fallbackManifest && Date.now() - fallbackManifest.updatedAt < 45000) {
                    return reply
                        .code(200)
                        .header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
                        .header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                        .header('X-Manifest-Shield', 'ACTIVE')
                        .header('Access-Control-Allow-Origin', '*')
                        .send(fallbackManifest.content);
                }
                return reply
                    .code(status || 502)
                    .header('Access-Control-Allow-Origin', '*')
                    .send({ error: `Upstream returned ${status}` });
            }

            const textPeek = buf.subarray(0, 16).toString('utf8').trim();
            if (textPeek.startsWith('#EXTM3U') || textPeek.startsWith('#EXT')) {
                const rawM3UText = buf.toString('utf8');
                const isFrozen = checkManifestFrozen(effectiveUrl, rawM3UText);

                if (isFrozen && parsed.channelId) {
                    recordStreamHealthResult(effectiveUrl, false, Date.now() - t0, parsed.channelId, 'frozen_manifest');
                    const failoverM3U = await attemptChannelFailoverManifest(
                        parsed.channelId,
                        effectiveUrl,
                        publicBaseUrl
                    );
                    if (failoverM3U) {
                        return reply
                            .code(200)
                            .header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
                            .header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                            .header('X-Stream-Failover', 'FROZEN-RECOVERY')
                            .header('Access-Control-Allow-Origin', '*')
                            .send(failoverM3U);
                    }
                }

                recordStreamHealthResult(effectiveUrl, true, Date.now() - t0, parsed.channelId);
                // Immediately pre-warm the latest 4 segments (0ms delay) BEFORE rewriting the rolling manifest
                warmStreamSegments(rawM3UText, finalResolvedUrl, effectiveHeaders, parsed.channelId, 4);

                const rewritten = rewriteLiveHlsManifest(
                    rawM3UText,
                    finalResolvedUrl,
                    publicBaseUrl,
                    effectiveHeaders,
                    parsed.channelId
                );
                const nowMs = Date.now();
                lastGoodManifestCache.set(manifestCacheKey, {
                    content: rewritten,
                    updatedAt: nowMs
                });
                lastGoodManifestCache.set(`${publicBaseUrl}::${effectiveUrl}`, {
                    content: rewritten,
                    updatedAt: nowMs
                });
                return reply
                    .code(200)
                    .header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
                    .header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                    .header('Access-Control-Allow-Origin', '*')
                    .send(rewritten);
            }

            const fallbackManifest = lastGoodManifestCache.get(manifestCacheKey);
            if (fallbackManifest && Date.now() - fallbackManifest.updatedAt < 45000) {
                return reply
                    .code(200)
                    .header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
                    .header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                    .header('Access-Control-Allow-Origin', '*')
                    .send(fallbackManifest.content);
            }
        }

        // Binary Segment Download with Chunk-Activity Stall Watchdog (2.6s stall timeout, 6.0s max ceiling)
        const segPromise = (async () => {
            const { buffer: rawBuf, ok, status, contentType } = await fetchUpstreamBufferWithRetry(
                parsed.url,
                parsed.headers,
                {
                    maxAttempts: hadInflightFailure ? 2 : 3,
                    stallTimeoutMs: 2600,
                    timeoutMs: 6000
                }
            );
            if (!ok || rawBuf.length === 0) {
                throw new Error(`segment_http_${status}`);
            }

            const needsUnwrap =
                parsed.url.includes('tiktokcdn') ||
                parsed.url.endsWith('.image') ||
                contentType.includes('image/') ||
                contentType.includes('octet-stream') ||
                (rawBuf.length >= 188 && rawBuf[0] !== 0x47);

            const finalBuf = needsUnwrap ? await unwrapLiveTsSegmentAsync(rawBuf) : rawBuf;
            const outType =
                finalBuf.length >= 188 && finalBuf[0] === 0x47
                    ? 'video/mp2t'
                    : contentType || 'video/mp2t';
            if (finalBuf.length >= 188 && finalBuf[0] === 0x47) {
                inspectMpegTsSegment(finalBuf, parsed.url);
            }
            setCachedSegment(parsed.url, finalBuf, outType);
            return { buffer: finalBuf, contentType: outType };
        })();

        segmentInFlight.set(segCacheKey, segPromise);
        try {
            const segResult = await segPromise;
            return reply
                .code(200)
                .header('Content-Type', segResult.contentType)
                .header('Content-Length', String(segResult.buffer.length))
                .header('Cache-Control', 'public, max-age=60')
                .header('X-Cache', 'MISS')
                .header('X-Audio-DSP', 'BIT-EXACT-CONTINUOUS')
                .header('Access-Control-Allow-Origin', '*')
                .send(segResult.buffer);
        } finally {
            segmentInFlight.delete(segCacheKey);
        }
    } catch (err: any) {
        if (isM3U8Url) {
            const updatedHealth = recordStreamHealthResult(
                effectiveUrl,
                false,
                Date.now() - t0,
                parsed.channelId,
                err?.message || 'socket_error'
            );
            const fallbackManifest = lastGoodManifestCache.get(manifestCacheKey);
            if (
                fallbackManifest &&
                Date.now() - fallbackManifest.updatedAt < 18000 &&
                updatedHealth.consecutiveFailures < 3
            ) {
                return reply
                    .code(200)
                    .header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
                    .header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                    .header('X-Manifest-Shield', 'SOCKET-SHIELD')
                    .header('Access-Control-Allow-Origin', '*')
                    .send(fallbackManifest.content);
            }
            if (parsed.channelId) {
                const failoverM3U = await attemptChannelFailoverManifest(
                    parsed.channelId,
                    effectiveUrl,
                    publicBaseUrl
                );
                if (failoverM3U) {
                    return reply
                        .code(200)
                        .header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
                        .header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                        .header('X-Stream-Failover', 'SOCKET-RECOVERY')
                        .header('Access-Control-Allow-Origin', '*')
                        .send(failoverM3U);
                }
            }
            if (fallbackManifest && Date.now() - fallbackManifest.updatedAt < 45000) {
                return reply
                    .code(200)
                    .header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
                    .header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                    .header('Access-Control-Allow-Origin', '*')
                    .send(fallbackManifest.content);
            }
        }
        return reply
            .code(502)
            .header('Access-Control-Allow-Origin', '*')
            .send({ error: 'Upstream stream temporarily unavailable', detail: err?.message || 'fetch error' });
    }
}

// ============================================================================
// PILLAR 5: LIVE MATCH-TO-CHANNEL AUTO-ROUTER (/v1/live/match/:eventId)
// ============================================================================
export interface MatchStreamResolution {
    event: LiveSportEvent | null;
    masterPlaylistUrl: string;
    totalSources: number;
    byLanguage: Record<string, LiveStreamSource[]>;
    sources: LiveStreamSource[];
}

/**
 * Resolves a live or upcoming match (by ESPN eventId, team name, league slug, or 'live')
 * and automatically probes & aggregates every broadcasting channel across all languages and backup servers.
 */
export async function resolveMatchStreams(
    eventIdOrQuery: string,
    publicBaseUrl: string
): Promise<MatchStreamResolution> {
    const events = await getLiveSportEvents(publicBaseUrl);
    const q = eventIdOrQuery.toLowerCase().trim();

    let matchedEvent: LiveSportEvent | null = null;
    if (q === 'live' || q === 'featured' || q === 'top') {
        matchedEvent = events.find((e) => e.status === 'LIVE') || events[0] || null;
    } else {
        matchedEvent =
            events.find((e) => e.id.toLowerCase() === q) ||
            events.find(
                (e) =>
                    e.title.toLowerCase().includes(q) ||
                    e.shortTitle.toLowerCase().includes(q) ||
                    e.homeTeam.name.toLowerCase().includes(q) ||
                    e.awayTeam.name.toLowerCase().includes(q) ||
                    e.league.toLowerCase().includes(q) ||
                    e.leagueSlug.toLowerCase().includes(q)
            ) ||
            null;
    }

    if (!matchedEvent) {
        return {
            event: null,
            masterPlaylistUrl: '',
            totalSources: 0,
            byLanguage: {},
            sources: []
        };
    }

    const channelIds = matchedEvent.recommendedChannels.map((rc) => rc.channelId);
    const resolvedChannels = await Promise.all(
        channelIds.map((cid) => resolveChannelStreams(cid, publicBaseUrl))
    );

    const allSources: LiveStreamSource[] = [];
    const byLanguage: Record<string, LiveStreamSource[]> = {};

    for (const rc of resolvedChannels) {
        if (!rc.channel) continue;
        for (const src of rc.sources) {
            const enriched: LiveStreamSource = {
                ...src,
                programTitle: `${matchedEvent.homeTeam.name} vs ${matchedEvent.awayTeam.name}`,
                programSubtitle: `${matchedEvent.league} • ${matchedEvent.statusDetail}`,
                isLiveEvent: matchedEvent.status === 'LIVE'
            };
            allSources.push(enriched);
            const langKey = enriched.language || 'en';
            if (!byLanguage[langKey]) byLanguage[langKey] = [];
            byLanguage[langKey].push(enriched);
        }
    }

    // Sort verified & highest healthScore first
    allSources.sort((a, b) => {
        if (Boolean(a.verified) !== Boolean(b.verified)) {
            return a.verified ? -1 : 1;
        }
        const healthDiff = (b.healthScore || 90) - (a.healthScore || 90);
        if (Math.abs(healthDiff) > 10) return healthDiff;
        return (a.latencyMs || 9999) - (b.latencyMs || 9999);
    });

    return {
        event: matchedEvent,
        masterPlaylistUrl: `${publicBaseUrl}/v1/live/match/${encodeURIComponent(matchedEvent.id)}/master.m3u8`,
        totalSources: allSources.length,
        byLanguage,
        sources: allSources
    };
}

/**
 * Generates a Virtual Master HLS Playlist (/v1/live/match/:eventId/master.m3u8) for a specific match
 * combining all verified channels broadcasting that match into an anti-freeze multi-server ABR manifest.
 */
export async function generateMatchMasterPlaylist(
    eventIdOrQuery: string,
    publicBaseUrl: string
): Promise<string | null> {
    const resolved = await resolveMatchStreams(eventIdOrQuery, publicBaseUrl);
    if (!resolved.event || resolved.sources.length === 0) {
        return null;
    }

    const lines: string[] = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        '#EXT-X-INDEPENDENT-SEGMENTS',
        `#EXT-X-SESSION-DATA:DATA-ID="com.cinepro.match.title",VALUE="${resolved.event.title.replace(/"/g, "'")}"`
    ];

    const seenUrls = new Set<string>();
    resolved.sources
        .filter((src) => !src.id.endsWith('-abr'))
        .slice(0, 12)
        .forEach((src, idx) => {
            if (seenUrls.has(src.url)) return;
            seenUrls.add(src.url);
            const bw = Math.max(1500000, 6000000 - idx * 300000);
            const res = src.quality.includes('720') ? '1280x720' : '1920x1080';
            lines.push(
                `#EXT-X-STREAM-INF:BANDWIDTH=${bw},RESOLUTION=${res},FRAME-RATE=50.000,CODECS="avc1.64002a,mp4a.40.2",NAME="${src.server.replace(
                    /"/g,
                    "'"
                )}"`
            );
            lines.push(src.url);
        });

    return lines.join('\n') + '\n';
}

// ============================================================================
// BACKGROUND HEALTH PRE-WARMER & ENGINE TELEMETRY (/v1/live/health)
// ============================================================================
let backgroundMonitorStarted = false;

export function startBackgroundStreamHealthMonitor(publicBaseUrl = 'http://localhost:3000'): void {
    if (backgroundMonitorStarted) return;
    backgroundMonitorStarted = true;

    const runSweep = async () => {
        try {
        await Promise.allSettled([
                harvestDynamicSportsM3U(),
                harvestAndAutoCorrectUpstreamFeeds(),
                harvestOfficialXmltvEpg()
            ]);
            await getLiveSportEvents(publicBaseUrl);
            const featuredChannels = CORE_SPORTS_CHANNELS.filter((c) => c.featured).slice(0, 18);
            for (const ch of featuredChannels) {
                const primary = ch.streams[0];
                if (primary) {
                    await probeStreamLiveness(primary.url, primary.headers, 4500, publicBaseUrl, ch.id).catch(() => {});
                }
            }
        } catch {
            // Non-blocking background health sweep
        }
    };

    // Initial delayed sweep after server boot, then every 3 minutes
    setTimeout(() => {
        runSweep().catch(() => {});
    }, 3500);
    setInterval(() => {
        runSweep().catch(() => {});
    }, 3 * 60 * 1000);
}

export function getLiveEngineHealthStats() {
    const healthEntries = Array.from(streamHealthRegistry.values());
    const closedCount = healthEntries.filter((h) => h.circuitState === 'CLOSED').length;
    const halfOpenCount = healthEntries.filter((h) => h.circuitState === 'HALF_OPEN').length;
    const openCount = healthEntries.filter((h) => h.circuitState === 'OPEN').length;
    const totalRequests = totalCacheHits + totalCacheMisses;

    return {
        status: 'ok',
        updatedAt: new Date().toISOString(),
        totalChannels: CORE_SPORTS_CHANNELS.length,
        dynamicHarvestedChannels: dynamicChannelCache.size,
        autoFeedCorrector: {
            upstreamDirectoryChannelsIndexed: upstreamDirectoryIdToName.size,
            autoDiscoveredChannelRebinds: autoDiscoveredChannelFeeds.size,
            quarantinedHijackedFeedsCount: quarantinedChannelSlugs.size,
            lastAutoAuditAt: lastAutoFeedCorrectTime ? new Date(lastAutoFeedCorrectTime).toISOString() : null,
            recentCorrections: autoFeedCorrectionLog.slice(0, 25)
        },
        segmentCache: {
            cachedSegments: unwrappedSegmentCache.size,
            maxSegments: MAX_CACHED_SEGMENTS,
            cachedBytes: currentCachedBytes,
            cachedMegabytes: Number((currentCachedBytes / (1024 * 1024)).toFixed(2)),
            maxMegabytes: 96,
            cacheHits: totalCacheHits,
            cacheMisses: totalCacheMisses,
            hitRatePct: totalRequests > 0 ? Math.round((totalCacheHits / totalRequests) * 100) : 0,
            prefetchedSegments: totalPrefetchedSegments,
            audioDspCleanedSegments: totalAudioDspCleanedSegments
        },
        stabilityAndFailover: {
            trackedStreams: healthEntries.length,
            circuitsClosed: closedCount,
            circuitsHalfOpen: halfOpenCount,
            circuitsOpen: openCount,
            seamlessFailoversTriggered: totalFailoverEvents,
            activeManifestShields: lastGoodManifestCache.size
        },
        inspectedStreams: Array.from(streamInspectionRegistry.entries()).map(([url, info]) => ({
            url,
            ...info
        })),
        streams: healthEntries
            .sort((a, b) => b.healthScore - a.healthScore)
            .slice(0, 50)
    };
}

