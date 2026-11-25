// lib/fast-cache.ts
const memoryCache = new Map<string, { data: unknown; ts: number }>();

export function getCached<T>(key: string, maxAgeMs = 60_000): T | null {
    const mem = memoryCache.get(key);
    if (mem && Date.now() - mem.ts < maxAgeMs) {
        return mem.data as T;
    }
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { data: T; ts: number };
        if (Date.now() - parsed.ts < maxAgeMs) {
            memoryCache.set(key, parsed);
            return parsed.data;
        }
    } catch {
        // ignore storage errors
    }
    return null;
}

export function setCached<T>(key: string, data: T): void {
    const entry = { data, ts: Date.now() };
    memoryCache.set(key, entry);
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(key, JSON.stringify(entry));
    } catch {
        // ignore quota errors
    }
}