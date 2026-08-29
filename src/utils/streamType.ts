import type { SourceType } from '@omss/framework';

export function getSourceType(url: string, isM3U8: boolean = false): SourceType {
    if (!url) return 'http';
    const lower = url.toLowerCase();
    
    if (isM3U8 || lower.includes('.m3u8')) return 'hls';
    if (lower.includes('.mkv')) return 'mkv';
    if (lower.includes('.webm')) return 'webm';
    if (lower.includes('.mpd')) return 'dash';
    if (lower.includes('.mp4')) return 'mp4';
    
    return 'http'; // fallback instead of mp4 so UI doesn't treat unknown links as direct mp4 downloads
}
