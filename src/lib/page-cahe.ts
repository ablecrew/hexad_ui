const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes for instant paint; always refresh in background

export function readPageCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { data: T; savedAt: number };
        if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > ttlMs) {
            return null;
        }
        return parsed.data;
    } catch {
        return null;
    }
}

export function writePageCache<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }));
    } catch {
        // Ignore storage quota or private-mode errors
    }
}