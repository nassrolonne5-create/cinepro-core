const score = (q, t) => {
    const quality = q.toLowerCase();
    if (quality === 'auto' || t === 'hls') return 100;
    if (quality.includes('4k') || quality.includes('2160')) return 90;
    if (quality.includes('1080')) return 80;
    if (quality.includes('720')) return 70;
    if (quality.includes('480')) return 60;
    if (quality.includes('360')) return 50;
    return 10;
};
const sources = [
    { quality: '720p', type: 'mp4' },
    { quality: '1080p', type: 'mp4' },
    { quality: 'auto', type: 'hls' },
    { quality: '480p', type: 'mp4' },
    { quality: '360p', type: 'mp4' },
    { quality: 'unknown', type: 'hls' }
];

sources.sort((a, b) => score(b.quality, b.type) - score(a.quality, a.type));
console.log(sources);
