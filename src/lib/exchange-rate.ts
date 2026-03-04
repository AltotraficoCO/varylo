export const FALLBACK_RATE = 4200;

export async function fetchUsdToCop(): Promise<number> {
    try {
        const res = await fetch('https://latest.currency-api.pages.dev/v1/currencies/usd.json');
        if (!res.ok) throw new Error();
        const data = await res.json();
        return Math.round(data.usd?.cop || FALLBACK_RATE);
    } catch {
        try {
            const res = await fetch(
                'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
            );
            if (!res.ok) throw new Error();
            const data = await res.json();
            return Math.round(data.usd?.cop || FALLBACK_RATE);
        } catch {
            return FALLBACK_RATE;
        }
    }
}
