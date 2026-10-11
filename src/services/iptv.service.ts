export interface IPTVChannel {
    id: string;
    name: string;
    category: 'sports' | 'broadcast' | 'entertainment';
    logo: string;
    country: string;
    streamUrls: string[];
    headers?: Record<string, string>;
}

export class IPTVService {
    private static channels: IPTVChannel[] = [
        // ==================== beIN SPORTS ====================
        {
            id: 'bein-sports-1',
            name: 'beIN Sports 1 Premium (HD)',
            category: 'sports',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Logo_bein_sports_1.png/1200px-Logo_bein_sports_1.png',
            country: 'QA',
            streamUrls: [
                'https://ott.udptv.xyz/stream/astro/beinsports1/master.m3u8?u=cocked&p=dd0abb52723d22acc0f97fe0336480feaa88a37ecda55a138a8d5e0ee14b0664',
                'https://tvsen6.aynaott.com/beinsports1/index.m3u8',
                'https://amg01174-amg01174c2-lg-au-4396.playouts.now.amagi.tv/playlist/amg01174-beinsportsasiafast-beinsportsextra-lgau/playlist.m3u8'
            ]
        },
        {
            id: 'bein-sports-2',
            name: 'beIN Sports 2 (HD)',
            category: 'sports',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Logo_bein_sports_2.png',
            country: 'QA',
            streamUrls: [
                'https://ott.udptv.xyz/stream/astro/beinsports2/master.m3u8?u=cocked&p=dd0abb52723d22acc0f97fe0336480feaa88a37ecda55a138a8d5e0ee14b0664',
                'https://tvsen6.aynaott.com/beinsports2/index.m3u8'
            ]
        },
        {
            id: 'bein-sports-3',
            name: 'beIN Sports 3 (HD)',
            category: 'sports',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Logo_bein_sports_3.png/1200px-Logo_bein_sports_3.png',
            country: 'QA',
            streamUrls: [
                'https://ott.udptv.xyz/stream/astro/beinsports3/master.m3u8?u=cocked&p=dd0abb52723d22acc0f97fe0336480feaa88a37ecda55a138a8d5e0ee14b0664'
            ]
        },
        {
            id: 'bein-sports-4',
            name: 'beIN Sports 4 (HD)',
            category: 'sports',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Logo_bein_sports_4.png/1200px-Logo_bein_sports_4.png',
            country: 'QA',
            streamUrls: [
                'https://ott.udptv.net/stream/iptv/beinsports4/master.m3u8?u=cocked&p=dd0abb52723d22acc0f97fe0336480feaa88a37ecda55a138a8d5e0ee14b0664'
            ]
        },
        {
            id: 'bein-sports-5',
            name: 'beIN Sports 5 (HD)',
            category: 'sports',
            logo: 'https://images.now-tv.com/shares/channelPreview/img/en_hk/color/ch645_425_305',
            country: 'QA',
            streamUrls: [
                'https://ott.udptv.net/stream/iptv/beinsports5/master.m3u8?u=cocked&p=dd0abb52723d22acc0f97fe0336480feaa88a37ecda55a138a8d5e0ee14b0664'
            ]
        },
        {
            id: 'bein-sports-us',
            name: 'beIN Sports USA (English)',
            category: 'sports',
            logo: 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/united-states/bein-sports-us.png',
            country: 'US',
            streamUrls: [
                'https://ott.udptv.xyz/stream/udptvus/beinsports/master.m3u8?u=cocked&p=dd0abb52723d22acc0f97fe0336480feaa88a37ecda55a138a8d5e0ee14b0664',
                'https://tvsen6.aynaott.com/beinsports/index.m3u8'
            ]
        },
        {
            id: 'bein-sports-xtra',
            name: 'beIN Sports XTRA (Free Live)',
            category: 'sports',
            logo: 'https://teamhandballnews.com/wp-content/uploads/2020/01/beIN-SPORTS-XTRA_LOGO-1024x127.png',
            country: 'US',
            streamUrls: [
                'https://amg01334-beinsportsllc-beinxtra-localnow-kcy6r.amagi.tv/playlist.m3u8',
                'https://amg01174-amg01174c2-lg-au-4396.playouts.now.amagi.tv/playlist/amg01174-beinsportsasiafast-beinsportsextra-lgau/playlist.m3u8'
            ]
        },

        // ==================== SKY SPORTS ====================
        {
            id: 'sky-sports-premier-league',
            name: 'Sky Sports Premier League (FHD)',
            category: 'sports',
            logo: 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/united-kingdom/sky-sports-premier-league-uk.png',
            country: 'UK',
            streamUrls: [
                'https://pixelstream-cdn.b-cdn.net/play/pAVJjXWDXadNqa4ml_eoyKC_Xzx6izbNiZpWlFuGfcrFzodBmXkg2vLpVA1CPNG4/114.m3u8',
                'https://ott.udptv.xyz/stream/skyuk/skysportspremierleague/master.m3u8'
            ],
            headers: {
                'Referer': 'https://pixelsport.tv/'
            }
        },
        {
            id: 'sky-sports-football',
            name: 'Sky Sports Football (HD)',
            category: 'sports',
            logo: 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/united-kingdom/sky-sports-football-uk.png',
            country: 'UK',
            streamUrls: [
                'https://ott.udptv.xyz/stream/skyuk/skysportsfootball/master.m3u8'
            ]
        },
        {
            id: 'sky-sports-main-event',
            name: 'Sky Sports Main Event (HD)',
            category: 'sports',
            logo: 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/united-kingdom/sky-sports-main-event-uk.png',
            country: 'UK',
            streamUrls: [
                'https://ott.udptv.xyz/stream/skyuk/skysportsmainevent/master.m3u8'
            ]
        },
        {
            id: 'sky-sports-f1',
            name: 'Sky Sports F1 (HD)',
            category: 'sports',
            logo: 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/united-kingdom/sky-sports-f1-uk.png',
            country: 'UK',
            streamUrls: [
                'https://ott.udptv.xyz/stream/skyuk/skysportsf1/master.m3u8'
            ]
        },

        // ==================== TNT SPORTS & ESPN ====================
        {
            id: 'tnt-sports-1',
            name: 'TNT Sports 1 (HD)',
            category: 'sports',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/TNT_Sports_1_logo.svg/1200px-TNT_Sports_1_logo.svg.png',
            country: 'UK',
            streamUrls: [
                'https://pixelstream-cdn.b-cdn.net/play/pAVJjXWDXadNqa4ml_eoyKC_Xzx6izbNiZpWlFuGfcqb8_OEw9cExJH2XxYQOVzH/158.m3u8',
                'https://ott.udptv.xyz/stream/skyuk/tntsports1/master.m3u8'
            ],
            headers: {
                'Referer': 'https://pixelsport.tv/'
            }
        },
        {
            id: 'espn-usa',
            name: 'ESPN USA (HD)',
            category: 'sports',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/1200px-ESPN_wordmark.svg.png',
            country: 'US',
            streamUrls: [
                'https://pixelstream-cdn.b-cdn.net/play/pAVJjXWDXadNqa4ml_eoyKC_Xzx6izbNiZpWlFuGfcrFzodBmXkg2vLpVA1CPNG4/114.m3u8',
                'https://ott.udptv.xyz/stream/udptvus/espn/master.m3u8'
            ],
            headers: {
                'Referer': 'https://pixelsport.tv/'
            }
        },

        // ==================== US BROADCAST NETWORKS (LATE NIGHT & TALK SHOWS) ====================
        {
            id: 'nbc-live',
            name: 'NBC Live (East) - Fallon & Seth Meyers',
            category: 'broadcast',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/NBC_logo_%282022%29.svg/1200px-NBC_logo_%282022%29.svg.png',
            country: 'US',
            streamUrls: [
                'https://townnews.g-mana.live/media/027a05c7-43b6-49eb-ad10-a0c0f10a0754/main.m3u8',
                'https://pubads.g.doubleclick.net/ssai/event/tQD6w9OJQVOobcyV3Dammw/master.m3u8'
            ]
        },
        {
            id: 'cbs-live',
            name: 'CBS Live - Stephen Colbert',
            category: 'broadcast',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/CBS_logo_%282020%29.svg/1200px-CBS_logo_%282020%29.svg.png',
            country: 'US',
            streamUrls: [
                'https://cbsn-us.cbsn.cbsstream.tv/out/v1/55a864888f13459e981f5401569760a5/master.m3u8',
                'https://streamer1.connectto.com/AABC_WEB_1201/index.m3u8'
            ]
        },
        {
            id: 'abc-live',
            name: 'ABC Live - Jimmy Kimmel Live',
            category: 'broadcast',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/ABC_logo_%282021%29.svg/1200px-ABC_logo_%282021%29.svg.png',
            country: 'US',
            streamUrls: [
                'https://d3svnrf3rmq619.cloudfront.net/krgv-live/smil:krgv-live.smil/playlist.m3u8',
                'https://amg00327-coxmediagroup-wftvbreaking-ono-hec7b.amagi.tv/playlist/amg00327-coxmediagroup-wftvbreaking-ono/playlist.m3u8'
            ]
        },
        {
            id: 'fox-live',
            name: 'FOX Live - Late Night & Sports',
            category: 'broadcast',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Fox_Broadcasting_Company_logo_%282020%29.svg/1200px-Fox_Broadcasting_Company_logo_%282020%29.svg.png',
            country: 'US',
            streamUrls: [
                'https://townnews.g-mana.live/media/027a05c7-43b6-49eb-ad10-a0c0f10a0754/main.m3u8'
            ]
        }
    ];

    public static getChannels(category?: string): IPTVChannel[] {
        if (!category || category === 'all') {
            return this.channels;
        }
        return this.channels.filter(c => c.category === category);
    }

    public static getChannelById(id: string): IPTVChannel | undefined {
        return this.channels.find(c => c.id === id);
    }

    public static async resolveChannelStream(id: string, publicBaseUrl: string): Promise<{
        channel: IPTVChannel;
        streamUrl: string;
        isProxied: boolean;
    } | null> {
        const channel = this.getChannelById(id);
        if (!channel) return null;

        for (const rawUrl of channel.streamUrls) {
            try {
                const headers = channel.headers || {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                };
                // Verify stream availability
                const ping = await fetch(rawUrl, {
                    method: 'GET',
                    headers,
                    signal: AbortSignal.timeout(3500)
                });

                if (ping.ok || ping.status === 200 || ping.status === 206) {
                    const proxyData = JSON.stringify({ url: rawUrl, headers });
                    const proxiedUrl = `${publicBaseUrl}/v1/proxy?data=${encodeURIComponent(proxyData)}&provider=iptv&ext=.m3u8`;
                    return {
                        channel,
                        streamUrl: proxiedUrl,
                        isProxied: true
                    };
                }
            } catch {
                // Try next mirror
            }
        }

        // Fallback: Return primary stream URL with proxy encoding
        const fallbackUrl = channel.streamUrls[0];
        const headers = channel.headers || {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        const proxyData = JSON.stringify({ url: fallbackUrl, headers });
        return {
            channel,
            streamUrl: `${publicBaseUrl}/v1/proxy?data=${encodeURIComponent(proxyData)}&provider=iptv&ext=.m3u8`,
            isProxied: true
        };
    }

    public static generateM3U(publicBaseUrl: string): string {
        let m3u = '#EXTM3U\n';
        for (const ch of this.channels) {
            const fallbackUrl = ch.streamUrls[0];
            const headers = ch.headers || {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            };
            const proxyData = JSON.stringify({ url: fallbackUrl, headers });
            const proxiedUrl = `${publicBaseUrl}/v1/proxy?data=${encodeURIComponent(proxyData)}&provider=iptv&ext=.m3u8`;

            m3u += `#EXTINF:-1 tvg-id="${ch.id}" tvg-name="${ch.name}" tvg-logo="${ch.logo}" group-title="${ch.category.toUpperCase()}",${ch.name}\n`;
            m3u += `${proxiedUrl}\n`;
        }
        return m3u;
    }
}
