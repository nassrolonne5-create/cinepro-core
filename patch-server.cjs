const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const oldHook = `    // Smart Sorting: Internet Speed Adaptive
    const app = server.getInstance();
    app.addHook('onSend', async (request, reply, payload) => {
        if (typeof payload === 'string' && (request.url.includes('/v1/movies') || request.url.includes('/v1/tv'))) {
            try {
                const data = JSON.parse(payload);
                if (data && data.sources && Array.isArray(data.sources)) {
                    data.sources.sort((a, b) => {
                        const getScore = (q, t) => {
                            const quality = (q || '').toLowerCase();
                            const type = (t || '').toLowerCase();
                            if (quality === 'auto' || type === 'hls' || type === 'dash') return 100;
                            if (quality.includes('4k') || quality.includes('2160')) return 90;
                            if (quality.includes('1080')) return 80;
                            if (quality.includes('720')) return 70;
                            if (quality.includes('480')) return 60;
                            if (quality.includes('360')) return 50;
                            return 10;
                        };
                        return getScore(b.quality, b.type) - getScore(a.quality, a.type);
                    });
                    return JSON.stringify(data);
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
        return payload;
    });`;

const newHook = `    // Smart Sorting: Internet Speed Adaptive
    const app = server.getInstance();
    app.addHook('onSend', async (request: any, reply: any, payload: any) => {
        if (typeof payload === 'string' && (request.url.includes('/v1/movies') || request.url.includes('/v1/tv'))) {
            try {
                const data = JSON.parse(payload);
                if (data && data.sources && Array.isArray(data.sources)) {
                    data.sources.sort((a: any, b: any) => {
                        const getScore = (q: any, t: any) => {
                            const quality = (q || '').toLowerCase();
                            const type = (t || '').toLowerCase();
                            if (quality === 'auto' || type === 'hls' || type === 'dash') return 100;
                            if (quality.includes('4k') || quality.includes('2160')) return 90;
                            if (quality.includes('1080')) return 80;
                            if (quality.includes('720')) return 70;
                            if (quality.includes('480')) return 60;
                            if (quality.includes('360')) return 50;
                            return 10;
                        };
                        return getScore(b.quality, b.type) - getScore(a.quality, a.type);
                    });
                    return JSON.stringify(data);
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
        return payload;
    });`;

code = code.replace(oldHook, newHook);
fs.writeFileSync('src/server.ts', code);
