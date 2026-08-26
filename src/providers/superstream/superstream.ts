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

export class SuperStreamProvider extends BaseProvider {
    readonly id = 'superstream';
    readonly name = 'SuperStream';
    readonly enabled = true;
    
    // The famous SuperStream / Showbox API endpoints
    readonly BASE_URL = 'https://showbox.shegu.net/api/api_client/res/';
    readonly API_KEY = '123d6cedf626dy54233aa1w6';
    readonly IV = 'b124m5c52c2dc8ab';
    readonly HEADERS = {}; // Required by BaseProvider

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    // Helper to encrypt the payload
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

    // Helper to decrypt the response
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
        } catch (e) {
            console.error('[SuperStream] Decryption failed', e);
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
        const diagnostics: any[] = [];
        try {
            // 1. Search for the title
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
                { headers: this.getHeaders(), timeout: 10000 }
            );

            const searchRes = this.decryptPayload(searchReq.data?.data);
            
            if (!searchRes || !searchRes.data) {
                return { sources: [], subtitles: [], diagnostics: [{ code: 'PROVIDER_ERROR', field: '', severity: 'error', message: 'No decrypted search results from SuperStream' }] };
            }

            // Find matching movie/show
            const items = searchRes.data.list || searchRes.data;
            const isMovie = media.type === 'movie';
            
            const match = items.find((item: any) => 
                item.title?.toLowerCase() === media.title?.toLowerCase() &&
                (isMovie ? item.box_type === 1 : item.box_type === 2)
            );

            if (!match) {
                return { sources: [], subtitles: [], diagnostics: [{ code: 'PROVIDER_ERROR', field: '', severity: 'error', message: 'No matching title found in SuperStream' }] };
            }

            // 2. Get the stream links
            const streamData: any = {
                module: isMovie ? 'Movie_downloadurl_v3' : 'TV_downloadurl_v3',
                tid: match.id,
                uid: '',
            };

            if (!isMovie && media.s && media.e) {
                streamData.season = media.s;
                streamData.episode = media.e;
            }

            const streamPayload = this.encryptPayload(JSON.stringify(streamData));
            
            const streamReq = await axios.post(
                this.BASE_URL,
                `data=${encodeURIComponent(streamPayload)}`,
                { headers: this.getHeaders(), timeout: 10000 }
            );

            const streamRes = this.decryptPayload(streamReq.data?.data);

            if (!streamRes || !streamRes.data || !streamRes.data.list) {
                return { sources: [], subtitles: [], diagnostics: [{ code: 'PROVIDER_ERROR', field: '', severity: 'error', message: 'No streams returned after decrypting payload' }] };
            }

            const sources: Source[] = [];
            
            // Extract the direct MP4 links
            for (const item of streamRes.data.list) {
                if (item.path) {
                    sources.push({
                        url: this.createProxyUrl(item.path, {}), // Proxy if necessary, Superstream allows direct usually
                        quality: item.real_quality || item.quality || '1080p',
                        type: getSourceType(item.path, false), // Direct MP4
                        audioTracks: [],
                        provider: {
                            name: this.name,
                            id: this.id
                        }
                    });
                }
            }

            return { sources, subtitles: [], diagnostics };
        } catch (e: any) {
            diagnostics.push({ code: 'PROVIDER_ERROR', field: '', severity: 'error', message: `SuperStream failed: ${e.message}` });
            return { sources: [], subtitles: [], diagnostics };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
