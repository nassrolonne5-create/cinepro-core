import { OMSSServer } from '@omss/framework';
import 'dotenv/config';

// Sanitize environment variables since some platforms might inject them with inline comments
for (const key of Object.keys(process.env)) {
    const val = process.env[key];
    if (typeof val === 'string' && val.includes('#')) {
        process.env[key] = val.split('#')[0].trim();
    }
}

// Force valid configurations for the dev server environment
if (!process.env.TMDB_API_KEY || process.env.TMDB_API_KEY === 'your_tmdb_api_key_here') {
    process.env.TMDB_API_KEY = 'fake_key';
}

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { knownThirdPartyProxies } from './thirdPartyProxies.js';
import { streamPatterns } from './streamPatterns.js';
import { configure as configureKaizoku } from 'kaizoku-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getEnv = (key: string, def?: string): any => {
    const val = process.env[key];
    if (!val) return def;
    return val.split('#')[0].trim() || def;
};

async function main() {
    configureKaizoku({ tmdbApiKey: (getEnv('TMDB_API_KEY') && getEnv('TMDB_API_KEY') !== 'your_tmdb_api_key_here') ? getEnv('TMDB_API_KEY') : 'fake_key' });
    configureKaizoku({ tmdbApiKey: (getEnv('TMDB_API_KEY') && getEnv('TMDB_API_KEY') !== 'your_tmdb_api_key_here') ? getEnv('TMDB_API_KEY') : 'fake_key' });
    const server = new OMSSServer({
        name: 'CinePro',
        version: '1.0.0',

        // Network
        host: '0.0.0.0',
        port: 3000,
        publicUrl: process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL,

        // Cache (memory for dev, Redis for prod)
        cache: {
            type: (getEnv('CACHE_TYPE') as 'memory' | 'redis') ?? 'memory',
            ttl: {
                sources: 60 * 60,
                subtitles: 60 * 60 * 24
            },
            redis: {
                host: getEnv('REDIS_HOST', 'localhost'),
                port: Number(getEnv('REDIS_PORT', '6379')),
                password: getEnv('REDIS_PASSWORD')
            }
        },

        // TMDB
        tmdb: {
            apiKey: (getEnv('TMDB_API_KEY') && getEnv('TMDB_API_KEY') !== 'your_tmdb_api_key_here') 
                ? getEnv('TMDB_API_KEY') 
                : 'fake_key',
            cacheTTL: 24 * 60 * 60 // 24h
        },

        // Third Party Proxy removal
        proxyConfig: {
            knownThirdPartyProxies: knownThirdPartyProxies,
            streamPatterns
        },

        cors: {
            origin: getEnv('CORS_ORIGIN', '*'),
            methods: ['GET', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            exposedHeaders: ['Content-Range', 'Accept-Ranges', 'ETag'],
            preflightContinue: false,
            optionsSuccessStatus: 204
        },

        stremio: {
            enableNativeAddon: true,
            stremioAddons: [
                {
                    id: "torrentio",
                    url: "https://torrentio.strem.fun/manifest.json",
                    enabled: true
                }
            ]
        },

        // MCP for AI agents
        mcp: {
            enabled: getEnv('MCP_ENABLED') === 'true'
        }
    });

    // Register providers
    const registry = server.getRegistry();
    await registry.discoverProviders(path.join(__dirname, './providers/'));
    console.log("REGISTERED PROVIDERS:", registry.getProviders().map(p => p.id));

    await server.start();

    const publicUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

    const uiUrl = `https://ui.cinepro.cc/?omssurl=${encodeURIComponent(publicUrl)}`;

    const title = '🚀 CinePro/ui is in public testing';
    const contrib =
        '🤝 We are looking for contributors to improve and develop!';
    const repo = 'Contribute: https://github.com/cinepro-org/ui';
    const tryIt = `🌐 Try it out: ${uiUrl} !`;
    const note =
        'You will need to give the website "access to local applications" that it works.';

    const lines = [title, '', repo, '', contrib, '', tryIt, '', note];

    // compute box width based on longest line
    const width = Math.max(...lines.map((l) => l.length)) + 2;

    const borderTop = '╭' + '─'.repeat(width) + '╮';
    const borderBottom = '╰' + '─'.repeat(width) + '╯';

    const pad = (line: string) => '│ ' + line.padEnd(width - 2, ' ') + ' │';

    console.log(`
================== CINEPRO BETA ANNOUNCEMENT ==================

${borderTop}
${lines.map(pad).join('\n')}
${borderBottom}
`);
}

main().catch((err) => {
    console.error("Server crashed:", err);
    process.exit(1);
});
