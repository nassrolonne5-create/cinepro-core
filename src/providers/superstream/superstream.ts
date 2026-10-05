import CryptoJS from 'crypto-js';
import axios from 'axios';
import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { getSourceType } from '../../utils/streamType.js';

const VIDNEST_ALPHABET = 'RB0fpH8ZEyVLkv7c2i6MAJ5u3IKFDxlS1NTsnGaqmXYdUrtzjwObCgQP94hoeW+/=';
const MAP: Record<string, number> = {};
for (let i = 0; i < VIDNEST_ALPHABET.length; i++) MAP[VIDNEST_ALPHABET[i]] = i;

function decodeVidnestBase64(input: string): string {
    let padded = input;
    const mod = padded.length % 4;
    if (mod !== 0) padded += '='.repeat(4 - mod);
    const bytes: number[] = [];
    for (let i = 0; i < padded.length; i += 4) {
        const chunk = padded.slice(i, i + 4);
        const c0 = MAP[chunk[0]] ?? 64;
        const c1 = MAP[chunk[1]] ?? 64;
        const c2 = chunk[2] === '=' ? 64 : (MAP[chunk[2]] ?? 64);
        const c3 = chunk[3] === '=' ? 64 : (MAP[chunk[3]] ?? 64);
        bytes.push(((c0 << 2) | (c1 >> 4)) & 0xff);
        if (c2 !== 64) bytes.push((((c1 & 0x0f) << 4) | (c2 >> 2)) & 0xff);
        if (c3 !== 64) bytes.push((((c2 & 0x03) << 6) | c3) & 0xff);
    }
    return Buffer.from(bytes).toString('utf8');
}

export class SuperStreamProvider extends BaseProvider {
    readonly id = 'superstream';
    readonly name = 'SuperStream';
    readonly enabled = true;
    
    readonly BASE_URL = 'https://showbox.shegu.net/api/api_client/res/';
    readonly API_KEY = '123d6cedf626dy54233aa1w6';
    readonly IV = 'b124m5c52c2dc8ab';
    readonly HEADERS = {};

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    private encryptPayload(data: string): string {
        const key = CryptoJS.enc.Utf8.parse(this.API_KEY);
        const iv = CryptoJS.enc.Utf8.parse(this.IV);
        const encrypted = CryptoJS.AES.encrypt(data, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return encrypted.toString();
    }

    private decryptPayload(ciphertext: string): any {
        try {
            const key = CryptoJS.enc.Utf8.parse(this.API_KEY);
            const iv = CryptoJS.enc.Utf8.parse(this.IV);
            const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });
            const text = decrypted.toString(CryptoJS.enc.Utf8);
            return JSON.parse(text);
        } catch {
            return null;
        }
    }

    private getHeaders() {
        return {
            'app-version': '11.5.0',
            'app-key': 'moviebox',
            'appid': 'net.mwm.moviebox.pro',
            'platform': 'android',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded'
        };
    }

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        // 1. Try native Showbox API
        try {
            const searchData = {
                module: 'Search4',
                page: 1,
                pagelimit: 20,
                keyword: media.title,
                type: 'all'
            };

            const searchPayload = this.encryptPayload(JSON.stringify(searchData));
            const searchReq = await axios.post(
                this.BASE_URL,
                `data=${encodeURIComponent(searchPayload)}`,
                { headers: this.getHeaders(), timeout: 4000 }
            );

            const searchRes = this.decryptPayload(searchReq.data?.data);
            if (searchRes && searchRes.data) {
                const items = searchRes.data.list || searchRes.data;
                const isMovie = media.type === 'movie';
                const match = items.find((item: any) => 
                    item.title?.toLowerCase() === media.title?.toLowerCase() &&
                    (isMovie ? item.box_type === 1 : item.box_type === 2)
                );

                if (match) {
                    const streamData: any = {
                        module: isMovie ? 'Movie_downloadurl_v3' : 'TV_downloadurl_v3',
                        tid: match.id,
                        uid: '',
                    };
                    if (!isMovie) {
                        streamData.season = media.s || 1;
                        streamData.episode = media.e || 1;
                    }

                    const streamPayload = this.encryptPayload(JSON.stringify(streamData));
                    const streamReq = await axios.post(
                        this.BASE_URL,
                        `data=${encodeURIComponent(streamPayload)}`,
                        { headers: this.getHeaders(), timeout: 4000 }
                    );

                    const streamRes = this.decryptPayload(streamReq.data?.data);
                    if (streamRes && streamRes.data && streamRes.data.list) {
                        const sources: Source[] = [];
                        for (const item of streamRes.data.list) {
                            if (item.path) {
                                sources.push({
                                    url: item.path,
                                    quality: item.real_quality || item.quality || 'Auto',
                                    type: getSourceType(item.path, item.path.includes('.m3u8')),
                                    audioTracks: [{ language: 'en', label: 'English' }],
                                    provider: {
                                        name: this.name,
                                        id: this.id
                                    }
                                });
                            }
                        }
                        if (sources.length > 0) {
                            return { sources, subtitles: [], diagnostics: [] };
                        }
                    }
                }
            }
        } catch {}

        // 2. High-speed MovieBox API fallback
        try {
            const segment = media.type === 'tv'
                ? `tv/${media.tmdbId}/${media.s || 1}/${media.e || 1}`
                : `movie/${media.tmdbId}`;

            const res = await fetch(`https://new.vidnest.fun/moviebox/${segment}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Origin': 'https://vidnest.fun',
                    'Referer': 'https://vidnest.fun/'
                },
                signal: AbortSignal.timeout(6000)
            });

            if (res.ok) {
                const json = await res.json() as any;
                if (json?.data) {
                    const raw = json.encrypted ? decodeVidnestBase64(json.data) : json.data;
                    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

                    if (Array.isArray(data.url)) {
                        const sources: Source[] = [];
                        for (const u of data.url) {
                            if (u?.link) {
                                sources.push({
                                    url: u.link,
                                    quality: u.resolution ? `${u.resolution}p` : '1080p',
                                    type: 'mp4',
                                    audioTracks: [{ language: 'en', label: 'English' }],
                                    provider: {
                                        name: this.name,
                                        id: this.id
                                    }
                                });
                            }
                        }
                        if (sources.length > 0) {
                            return { sources, subtitles: [], diagnostics: [] };
                        }
                    }
                }
            }
        } catch {}

        return { sources: [], subtitles: [], diagnostics: [] };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
