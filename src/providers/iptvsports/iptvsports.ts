import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import {
    CORE_SPORTS_CHANNELS,
    resolveChannelStreams
} from '../../iptv/liveSportsEngine.js';

export class IptvSportsProvider extends BaseProvider {
    readonly id = 'iptvsports';
    readonly name = 'IPTV Sports';
    readonly enabled = true;
    readonly BASE_URL = 'https://iptv-org.github.io';
    readonly HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    private findMatchingChannel(media: ProviderMediaObject): string | null {
        const rawId = String(media.tmdbId || '').toLowerCase().trim().replace(/^live[-:]/, '');
        const title = String(media.title || '').toLowerCase().trim();

        const byId = CORE_SPORTS_CHANNELS.find(
            (ch) =>
                ch.id === rawId ||
                ch.shortName.toLowerCase().replace(/\s+/g, '-') === rawId
        );
        if (byId) return byId.id;

        if (title) {
            const byTitle = CORE_SPORTS_CHANNELS.find(
                (ch) =>
                    ch.name.toLowerCase() === title ||
                    ch.shortName.toLowerCase() === title ||
                    title.includes(ch.shortName.toLowerCase())
            );
            if (byTitle) return byTitle.id;
        }

        return null;
    }

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.resolveLiveSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.resolveLiveSources(media);
    }

    private async resolveLiveSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const matchedChannelId = this.findMatchingChannel(media);
        if (!matchedChannelId) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }

        const publicBaseUrl =
            process.env.PUBLIC_URL ||
            process.env.RENDER_EXTERNAL_URL ||
            (this as any).proxyConfig?.proxyBaseUrl ||
            'http://localhost:3000';

        const resolved = await resolveChannelStreams(matchedChannelId, publicBaseUrl);
        if (!resolved.channel || resolved.sources.length === 0) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }

        const sources: Source[] = resolved.sources.map((s) => ({
            url: s.url,
            type: 'hls',
            quality: s.quality,
            server: s.server,
            audioTracks: s.audioTracks,
            provider: {
                id: this.id,
                name: `${this.name} (${s.language.toUpperCase()})`
            },
            headers: s.headers || {}
        } as unknown as Source));

        return {
            sources,
            subtitles: [],
            diagnostics: []
        };
    }
}
