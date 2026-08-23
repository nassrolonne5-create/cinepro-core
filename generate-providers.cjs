const fs = require('fs');
const path = require('path');

const providersToMake = [
    { id: 'vidnest', name: 'Cabin', module: 'vidnest' },
    { id: 'vidrock', name: 'Atlas', module: 'vidrock' },
    { id: 'cinesu', name: 'Vidx', module: 'cinesu' },
    { id: 'vidup', name: 'Cargo', module: 'vidup' },
    { id: 'vixsrc', name: 'VixSrc', module: 'vixsrc' },
    { id: 'vidfast', name: 'Photon', module: 'vidfast' },
    { id: 'vidzee', name: 'VidZee', module: 'vidzee' }
];

for (const p of providersToMake) {
    const code = `import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source
} from '@omss/framework';
import { fetchSources } from 'kaizoku-core/providers/movies/${p.module}';

export class ${p.id.charAt(0).toUpperCase() + p.id.slice(1)}Provider extends BaseProvider {
    readonly id = '${p.id}';
    readonly name = '${p.name}';
    readonly enabled = true;
    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.fetchSources(media);
    }

    private async fetchSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            const data = await fetchSources(media.tmdbId, media.type, media.s, media.e);
            const headers = data.headers || {};
            const sources: Source[] = [];

            for (const src of data.sources) {
                sources.push({
                    url: this.createProxyUrl(src.url, headers),
                    quality: src.quality || 'auto',
                    type: src.isM3U8 || src.url.includes('.m3u8') ? 'hls' : 'mp4',
                    audioTracks: [],
                    provider: {
                        name: src.server ? \`${p.name} (\${src.server})\` : this.name,
                        id: this.id
                    }
                });
            }
            return { sources, subtitles: [], diagnostics: [] };
        } catch (e) {
            return { sources: [], subtitles: [], diagnostics: [] };
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}
`;
    fs.writeFileSync(`src/providers/${p.id}/${p.id}.ts`, code);
}
