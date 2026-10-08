import 'kaizoku-core';

declare module 'kaizoku-core' {
    export const rivestream: {
        fetchSources(tmdbId: string, type: "movie" | "tv", season?: number, episode?: number): Promise<any>;
    };

    export const vidgod: {
        fetchSources(tmdbId: string, type: "movie" | "tv", season?: number, episode?: number): Promise<any>;
    };

    export const lmscript: {
        fetchSources(tmdbId: string, type: "movie" | "tv", season?: number, episode?: number): Promise<any>;
    };

    export const trendimovies: {
        getDownloads(tmdbId: string, type: "movie" | "tv", season?: number, episode?: number): Promise<any>;
    };
}
