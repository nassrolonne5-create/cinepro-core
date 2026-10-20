import { Readable } from 'node:stream';

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
    category: 'bein' | 'fox' | 'espn' | 'sky' | 'europe' | 'mena' | 'usa' | 'combat' | 'motorsport';
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

/**
 * Curated Core Sports & beIN Sports Channel Matrix (AR / EN / FR / ES / TR + Global Sports)
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
            { label: 'beIN 1 AR (Primary FHD)', url: 'http://primetv.cc.cd/beinfhd11/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN 1 AR (Direct Track)', url: 'http://primetv.cc.cd/beinfhd11/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN 1 Multi Backup', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs1.m3u8', quality: '720p', language: 'ar' }
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
            { label: 'beIN 2 AR (Primary FHD)', url: 'http://primetv.cc.cd/beinfhd22/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN 2 AR (Direct Track)', url: 'http://primetv.cc.cd/beinfhd22/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN 2 Multi Backup', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs2.m3u8', quality: '720p', language: 'ar' }
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
            { label: 'beIN 3 AR (Primary FHD)', url: 'http://primetv.cc.cd/beinfhd33/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN 3 AR (Direct Track)', url: 'http://primetv.cc.cd/beinfhd33/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN 3 Multi Backup', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs3.m3u8', quality: '720p', language: 'ar' }
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
            { label: 'beIN 4 AR (Primary FHD)', url: 'http://primetv.cc.cd/beinfhd44/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN 4 AR (Direct Track)', url: 'http://primetv.cc.cd/beinfhd44/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN 4 Multi Backup', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs4.m3u8', quality: '720p', language: 'ar' }
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
            { label: 'beIN 5 AR (Primary FHD)', url: 'http://primetv.cc.cd/beinfhd55/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN 5 AR (Direct Track)', url: 'http://primetv.cc.cd/beinfhd55/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN 5 Multi Backup', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs5.m3u8', quality: '720p', language: 'ar' }
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
            { label: 'beIN 6 AR (Primary FHD)', url: 'http://primetv.cc.cd/beinfhd66/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN 6 AR (Direct Track)', url: 'http://primetv.cc.cd/beinfhd66/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN 7 AR (Primary FHD)', url: 'http://primetv.cc.cd/beinfhd77/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN 7 AR (Direct Track)', url: 'http://primetv.cc.cd/beinfhd77/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN 8 AR (Primary FHD)', url: 'http://primetv.cc.cd/beinfhd88/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN 8 AR (Direct Track)', url: 'http://primetv.cc.cd/beinfhd88/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN 9 AR (Primary FHD)', url: 'http://primetv.cc.cd/beinfhd99/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN 9 AR (Direct Track)', url: 'http://primetv.cc.cd/beinfhd99/tracks-v1a1/mono.tbin.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Premium 1 AR (FHD)', url: 'http://primetv.cc.cd/beinfhd11/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN Premium 1 AR (Mirror)', url: 'http://primetv.cc.cd/beinfhd22/index.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Premium 2 AR (FHD)', url: 'http://primetv.cc.cd/beinfhd22/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN Premium 2 AR (Mirror)', url: 'http://primetv.cc.cd/beinfhd33/index.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN Premium 3 AR (FHD)', url: 'http://primetv.cc.cd/beinfhd33/index.m3u8', quality: '1080p', language: 'ar' },
            { label: 'beIN Premium 3 AR (Mirror)', url: 'http://primetv.cc.cd/beinfhd44/index.m3u8', quality: '1080p', language: 'ar' }
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
            { label: 'beIN English Backup (FHD)', url: 'http://primetv.cc.cd/beinfhd77/index.m3u8', quality: '1080p', language: 'en' }
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
            { label: 'beIN 1 English (Primary FHD)', url: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', quality: '1080p', language: 'en' },
            { label: 'beIN 1 English (MENA EN Feed)', url: 'http://primetv.cc.cd/beinfhd77/index.m3u8', quality: '1080p', language: 'en' },
            { label: 'beIN 1 English (Intl Feed)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs1.m3u8', quality: '720p', language: 'en' }
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
            { label: 'beIN 2 English (MENA EN Feed)', url: 'http://primetv.cc.cd/beinfhd88/index.m3u8', quality: '1080p', language: 'en' },
            { label: 'beIN 2 English (Amagi Feed)', url: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', quality: '1080p', language: 'en' }
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
            { label: 'beIN 3 English (MENA EN Feed)', url: 'http://primetv.cc.cd/beinfhd99/index.m3u8', quality: '1080p', language: 'en' },
            { label: 'beIN 3 English (Backup)', url: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', quality: '1080p', language: 'en' }
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
            { label: 'beIN 1 France (Feed 1 FHD)', url: 'http://primetv.cc.cd/beinfhd99/index.m3u8', quality: '1080p', language: 'fr' },
            { label: 'beIN 1 France (FR Sports Backup)', url: 'https://dq37unyetkpcz.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-m04j89j7k5gtp/LEquipe_FR.m3u8', quality: '1080p', language: 'fr' },
            { label: 'beIN 1 France (Euro Mirror)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs1.m3u8', quality: '720p', language: 'fr' }
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
            { label: 'beIN 2 France (Feed 1 FHD)', url: 'http://primetv.cc.cd/beinfhd88/index.m3u8', quality: '1080p', language: 'fr' },
            { label: 'beIN 2 France (FR FIFA+ Mirror)', url: 'https://37b4c228.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWZyX0ZJRkFQbHVzRnJlbmNoX0hMUw/playlist.m3u8', quality: '720p', language: 'fr' },
            { label: 'beIN 2 France (Euro Mirror)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs2.m3u8', quality: '720p', language: 'fr' }
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
            { label: 'beIN 3 France (Feed 1 FHD)', url: 'http://primetv.cc.cd/beinfhd66/index.m3u8', quality: '1080p', language: 'fr' },
            { label: 'beIN 3 France (Africa 24 FR Mirror)', url: 'https://africa24.vedge.infomaniak.com/livecast/ik:africa24sport/manifest.m3u8', quality: '1080p', language: 'fr' },
            { label: 'beIN 3 France (Euro Mirror)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs3.m3u8', quality: '720p', language: 'fr' }
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
        featured: false,
        streams: [
            { label: 'beIN 1 TR (Direct HLS)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs1.m3u8', quality: '1080p', language: 'tr' }
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
            { label: 'beIN 2 TR (Direct HLS)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs2.m3u8', quality: '1080p', language: 'tr' }
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
            { label: 'beIN 3 TR (Direct HLS)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs3.m3u8', quality: '1080p', language: 'tr' }
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
            { label: 'beIN 4 TR (Direct HLS)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs4.m3u8', quality: '1080p', language: 'tr' }
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
            { label: 'beIN 5 TR (Direct HLS)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebs5.m3u8', quality: '1080p', language: 'tr' }
        ]
    },
    {
        id: 'bein-sports-haber-tr',
        name: 'beIN Sports Haber HD',
        shortName: 'beIN Haber',
        network: 'beIN Sports',
        category: 'bein',
        language: 'tr',
        languageLabel: 'Türkçe (Turkish)',
        country: 'TR',
        logo: 'https://i.imgur.com/QWo0x7S.jpg',
        quality: '1080p',
        featured: false,
        streams: [
            { label: 'beIN Haber TR (Direct HLS)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivebsh.m3u8', quality: '1080p', language: 'tr' }
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
        featured: false,
        streams: [
            { label: 'beIN XTRA Español (Primary)', url: 'http://201.190.41.246:9060/play/a03y/index.m3u8', quality: '1080p', language: 'es' },
            { label: 'beIN XTRA Backup', url: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', quality: '1080p', language: 'es' }
        ]
    },

    // =========================================================================
    // 5. FOX SPORTS & US SPORTS NETWORKS
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
        quality: '720p',
        featured: true,
        streams: [
            { label: 'Fox Sports 1 (US Primary HD)', url: 'http://85.237.89.160:9590/usa-s/FOX-SPORTS-1/index.m3u8', quality: '720p', language: 'en' },
            { label: 'Fox Sports News (Akamai 1080p)', url: 'https://skynewsau-live-premium.akamaized.net/hls/live/2105307/foxsportsnews/live_1080p.m3u8', quality: '1080p', language: 'en' }
        ]
    },
    {
        id: 'fox-sports-2',
        name: 'Fox Sports 2 / Intl HD',
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
            { label: 'Fox Sports Intl (1080p)', url: 'http://138.59.227.20:8000/play/a085/index.m3u8', quality: '1080p', language: 'en' },
            { label: 'Fox Sports Backup (720p)', url: 'http://85.237.89.160:9590/usa-s/FOX-SPORTS-1/index.m3u8', quality: '720p', language: 'en' }
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
        quality: '720p',
        featured: true,
        streams: [
            { label: 'ESPN US (Primary HD)', url: 'http://85.237.89.160:9590/usa-s/ESPN-HD/index.m3u8', quality: '720p', language: 'en' },
            { label: 'ESPN Intl (1080p)', url: 'https://barinaslive1.boldmss.com/ESPN/ESPN.isml/ESPN.m3u8', quality: '1080p', language: 'en' }
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
        quality: '720p',
        featured: true,
        streams: [
            { label: 'ESPN 2 US (Primary HD)', url: 'http://85.237.89.160:9590/usa-s/ESPN-2-HD/index.m3u8', quality: '720p', language: 'en' },
            { label: 'ESPN 2 Intl (1080p)', url: 'https://barinaslive1.boldmss.com/ESPN_2/ESPN_2.isml/ESPN_2.m3u8', quality: '1080p', language: 'en' }
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
        quality: '720p',
        featured: false,
        streams: [
            { label: 'ESPNU HD (US Primary)', url: 'http://85.237.89.160:9590/usa-s/ESPN-U-HD/index.m3u8', quality: '720p', language: 'en' },
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
            { label: 'CBS Golazo (Google DAI 1080p)', url: 'https://dai.google.com/linear/hls/event/7f3Wv6f7QEKfQna22jHqLQ/master.m3u8', quality: '1080p', language: 'en' },
            { label: 'CBS Golazo (Pluto Mirror)', url: 'https://jmp2.uk/plu-63a0e33a45264d000850ed7e.m3u8', quality: '720p', language: 'en' }
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
        quality: '720p',
        featured: true,
        streams: [
            { label: 'NBA TV (Primary HD)', url: 'http://198.58.104.90:8989/nba/index.m3u8', quality: '720p', language: 'en' },
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
        quality: '720p',
        featured: true,
        streams: [
            { label: 'NFL Network (Primary HD)', url: 'http://198.58.104.90:8989/nfl/index.m3u8', quality: '720p', language: 'en' },
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
            { label: 'NHL Network (Amagi 1080p)', url: 'https://nhl-firetv.amagi.tv/playlist.m3u8', quality: '1080p', language: 'en' }
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
        quality: '720p',
        featured: false,
        streams: [
            { label: 'MLB Strike Zone (US HD)', url: 'http://23.237.104.106:8080/USA_MLB_STRIKE_ZONE/index.m3u8', quality: '720p', language: 'en' },
            { label: 'MLB Channel (Pluto HD)', url: 'https://jmp2.uk/plu-5e66968a70f34c0007d050be.m3u8', quality: '720p', language: 'en' }
        ]
    },

    // =========================================================================
    // 6. EUROPEAN, FRENCH & UK SPORTS (Eurosport, L'Équipe, FIFA+, Premier Sports)
    // =========================================================================
    {
        id: 'eurosport-1',
        name: 'Eurosport 1 HD',
        shortName: 'Eurosport 1',
        network: 'Eurosport',
        category: 'europe',
        language: 'en',
        languageLabel: 'Multi / English',
        country: 'FR',
        logo: 'https://i.imgur.com/olQJgm7.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Eurosport 1 (Primary HLS)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivees1.m3u8', quality: '1080p', language: 'multi' },
            { label: 'Eurosport 1 (EU Mirror)', url: 'http://88.212.15.17/live/esp1_hun/index.m3u8', quality: '720p', language: 'multi' }
        ]
    },
    {
        id: 'eurosport-2',
        name: 'Eurosport 2 HD',
        shortName: 'Eurosport 2',
        network: 'Eurosport',
        category: 'europe',
        language: 'en',
        languageLabel: 'Multi / English',
        country: 'FR',
        logo: 'https://i.imgur.com/f56dHgR.png',
        quality: '1080p',
        featured: true,
        streams: [
            { label: 'Eurosport 2 (Primary HLS)', url: 'https://andro.mangeinde4.lat/checklist/androstreamlivees2.m3u8', quality: '1080p', language: 'multi' },
            { label: 'Eurosport 2 (EU Mirror)', url: 'http://88.212.15.17/live/esp2_hun/index.m3u8', quality: '720p', language: 'multi' }
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
            { label: 'Premier Sports 1 (Amagi 1080p)', url: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8', quality: '1080p', language: 'en' }
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
            { label: 'Premier Sports 2 (Amagi 1080p)', url: 'https://amg19223-amg19223c4-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c4-amgplt0351/playlist.m3u8', quality: '1080p', language: 'en' }
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
        quality: '720p',
        featured: true,
        streams: [
            { label: 'DAZN Combat (Primary)', url: 'https://jmp2.uk/plu-64d626ac9b414d000820e2fc.m3u8', quality: '720p', language: 'en' },
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

// Dynamic M3U Harvester Cache
let dynamicChannelCache: Map<string, Array<{ label: string; url: string; quality: string }>> = new Map();
let lastHarvestTime = 0;
const HARVEST_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Harvests fresh M3U streams from public IPTV-org sports & regional feeds in the background
 */
export async function harvestDynamicSportsM3U(): Promise<void> {
    if (Date.now() - lastHarvestTime < HARVEST_TTL_MS && dynamicChannelCache.size > 0) {
        return;
    }

    const m3uFeeds = [
        'https://iptv-org.github.io/iptv/categories/sports.m3u',
        'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/qa.m3u',
        'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us.m3u',
        'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/fr.m3u'
    ];

    const harvested = new Map<string, Array<{ label: string; url: string; quality: string }>>();

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

                    let j = i + 1;
                    while (j < lines.length && lines[j].startsWith('#EXTVLCOPT')) j++;
                    const streamUrl = (lines[j] || '').trim();
                    if (!streamUrl.startsWith('http') || streamUrl.endsWith('.mpd')) continue;

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
                        } else if (ch.id === 'bein-sports-xtra-en' && key.includes('beinsportsxtra.us@sd')) {
                            matched = true;
                        } else if (ch.id === 'fox-sports-1' && key.includes('foxsports1.us')) {
                            matched = true;
                        } else if (ch.id === 'espn-hd' && key.includes('espn.us@hd')) {
                            matched = true;
                        } else if (ch.id === 'espn-2-hd' && key.includes('espn2.us@hd')) {
                            matched = true;
                        }

                        if (matched) {
                            const existing = harvested.get(ch.id) || [];
                            if (!existing.some((e) => e.url === streamUrl)) {
                                existing.push({
                                    label: `${ch.shortName} (Harvested ${quality})`,
                                    url: streamUrl,
                                    quality
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
 * Fast liveness check for an M3U8 stream
 */
async function probeStreamLiveness(url: string, headers?: Record<string, string>, timeoutMs = 2500): Promise<{ ok: boolean; latencyMs: number }> {
    const t0 = Date.now();
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': DEFAULT_UA,
                ...(headers || {})
            },
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
    // Trigger background harvest non-blockingly
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
 * Resolves and verifies all streams for a given channel ID
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

    // Merge curated streams + dynamically harvested M3U backups
    const dynamicBackups = dynamicChannelCache.get(channel.id) || [];
    const candidateStreams = [...channel.streams];
    for (const dyn of dynamicBackups) {
        if (!candidateStreams.some((s) => s.url === dyn.url)) {
            candidateStreams.push({
                label: dyn.label,
                url: dyn.url,
                quality: dyn.quality,
                language: channel.language
            });
        }
    }

    // Also attach cross-language beIN Sports fallback feeds if a user is watching beIN Sports
    if (channel.category === 'bein') {
        const fallbackBein = CORE_SPORTS_CHANNELS.filter(
            (c) => c.category === 'bein' && c.id !== channel.id && c.featured
        ).slice(0, 3);
        for (const fb of fallbackBein) {
            if (fb.streams[0] && !candidateStreams.some((s) => s.url === fb.streams[0].url)) {
                candidateStreams.push({
                    label: `${fb.shortName} (${fb.language.toUpperCase()} Backup)`,
                    url: fb.streams[0].url,
                    quality: fb.streams[0].quality,
                    language: fb.language
                });
            }
        }
    }

    // Probe all candidate streams in parallel
    const probed = await Promise.all(
        candidateStreams.map(async (item, index) => {
            const probe = await probeStreamLiveness(item.url, item.headers, 2500);
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
    const unverifiedStreams = probed.filter((s) => !s.verified);

    const finalSources = verifiedStreams.length > 0 ? [...verifiedStreams, ...unverifiedStreams.slice(0, 1)] : probed;

    return {
        channel,
        sources: finalSources
    };
}

/**
 * Live Sports Events Scraper (ESPN Scoreboard API + Smart beIN/Fox/ESPN Channel Mapper)
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
        { sport: 'soccer', slug: 'uefa.champions', label: 'UEFA Champions League', defaultChannels: ['bein-sports-1-ar', 'bein-sports-en-1', 'bein-sports-fr-1', 'cbs-sports-golazo'] },
        { sport: 'soccer', slug: 'uefa.europa', label: 'UEFA Europa League', defaultChannels: ['bein-sports-2-ar', 'bein-sports-en-2', 'bein-sports-fr-2', 'cbs-sports-golazo'] },
        { sport: 'soccer', slug: 'eng.1', label: 'English Premier League', defaultChannels: ['bein-sports-1-ar', 'bein-sports-2-ar', 'bein-sports-en-1', 'nbc-sports-now'] },
        { sport: 'soccer', slug: 'esp.1', label: 'Spanish LaLiga', defaultChannels: ['bein-sports-3-ar', 'bein-sports-en-1', 'bein-sports-fr-1', 'espn-hd'] },
        { sport: 'soccer', slug: 'ita.1', label: 'Italian Serie A', defaultChannels: ['bein-sports-4-ar', 'cbs-sports-golazo', 'bein-sports-fr-2'] },
        { sport: 'soccer', slug: 'ger.1', label: 'German Bundesliga', defaultChannels: ['bein-sports-5-ar', 'bein-sports-fr-2', 'espn-2-hd'] },
        { sport: 'soccer', slug: 'fra.1', label: 'French Ligue 1', defaultChannels: ['bein-sports-6-ar', 'bein-sports-fr-1', 'bein-sports-en-2', 'lequipe-fr'] },
        { sport: 'basketball', slug: 'nba', label: 'NBA Basketball', defaultChannels: ['bein-sports-en-1', 'bein-sports-fr-3', 'nba-tv', 'espn-hd'] },
        { sport: 'football', slug: 'nfl', label: 'NFL Football', defaultChannels: ['fox-sports-1', 'nfl-network', 'espn-hd', 'bein-sports-en-2'] },
        { sport: 'mma', slug: 'ufc', label: 'UFC / MMA', defaultChannels: ['espn-hd', 'dazn-combat', 'bein-sports-fr-3', 'bein-sports-en-1'] }
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

                    // Map recommended playable CinePro channels (always including beIN AR/EN/FR + Fox/ESPN if relevant)
                    const recIds = new Set<string>(lg.defaultChannels);
                    const bText = broadcasts.join(' ').toLowerCase();
                    if (bText.includes('fox') || bText.includes('fs1')) recIds.add('fox-sports-1');
                    if (bText.includes('espn')) recIds.add('espn-hd');
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

    // Sort: LIVE events first, then UPCOMING by start time, then FINISHED
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
        try {
            return new URL(rel, baseUrl).toString();
        } catch {
            return rel;
        }
    };

    const wrapProxy = (targetUrl: string, isSubManifest: boolean): string => {
        const payload = JSON.stringify({
            url: targetUrl,
            headers: {
                'User-Agent': DEFAULT_UA,
                ...(headers || {})
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
            // Rewrite URI="..." inside #EXT-X-MEDIA or #EXT-X-KEY or #EXT-X-MAP
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

        // Non-comment line is a stream/segment URL
        const absUrl = resolveRelative(trimmed);
        const isSubPlaylist = /\.m3u8(\?|$)/i.test(absUrl);
        rewritten.push(wrapProxy(absUrl, isSubPlaylist));
    }

    return rewritten.join('\n');
}

/**
 * Handles proxying of Live HLS manifests (.m3u8) and MPEG-TS/fMP4 segments (.ts, .tbin, .m4s)
 * with no-cache headers for live manifests so hls.js continuously fetches fresh chunks.
 */
export async function handleLiveHlsProxyRequest(
    encodedData: string,
    publicBaseUrl: string,
    reply: any
): Promise<any> {
    let parsed: { url: string; headers?: Record<string, string> };
    try {
        parsed = JSON.parse(decodeURIComponent(encodedData));
    } catch {
        parsed = JSON.parse(encodedData);
    }

    if (!parsed?.url) {
        return reply.code(400).send({ error: 'Missing url in proxy data' });
    }

    const upstreamRes = await fetch(parsed.url, {
        method: 'GET',
        headers: {
            'User-Agent': DEFAULT_UA,
            ...(parsed.headers || {})
        },
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
                upstreamRes.url || parsed.url,
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

        // Actually binary segment disguised with text/plain header
        return reply
            .code(200)
            .header('Content-Type', 'video/mp2t')
            .header('Cache-Control', 'public, max-age=60')
            .header('Access-Control-Allow-Origin', '*')
            .send(buf);
    }

    // Stream binary video segments (.ts, .tbin, .m4s, .aac) directly
    if (upstreamRes.body) {
        const nodeStream = Readable.fromWeb(upstreamRes.body as any);
        const segType = contentType && !contentType.includes('octet-stream') ? contentType : 'video/mp2t';
        return reply
            .code(200)
            .header('Content-Type', segType)
            .header('Cache-Control', 'public, max-age=60')
            .header('Access-Control-Allow-Origin', '*')
            .send(nodeStream);
    }

    const fallbackBuf = Buffer.from(await upstreamRes.arrayBuffer());
    return reply
        .code(200)
        .header('Content-Type', 'video/mp2t')
        .header('Access-Control-Allow-Origin', '*')
        .send(fallbackBuf);
}
