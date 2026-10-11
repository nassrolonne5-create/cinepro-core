let cachedToken: string | null = null;
let tokenExpiry = 0;
let pendingPromise: Promise<string | null> | null = null;

export async function getVidVaultToken(): Promise<string | null> {
    const now = Date.now();
    if (cachedToken && now < tokenExpiry) {
        return cachedToken;
    }
    if (pendingPromise) {
        return pendingPromise;
    }

    pendingPromise = (async () => {
        try {
            const res = await fetch('https://vidvault.to/api/get-token', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
                    'Referer': 'https://vidvault.ru/'
                },
                signal: AbortSignal.timeout(7000)
            });
            if (res.ok) {
                const data = (await res.json()) as any;
                if (data?.t) {
                    cachedToken = data.t;
                    tokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
                    return cachedToken;
                }
            }
        } catch {
            // Fail gracefully
        } finally {
            pendingPromise = null;
        }
        return cachedToken;
    })();

    return pendingPromise;
}

// Pre-warm token in background immediately
getVidVaultToken().catch(() => {});
