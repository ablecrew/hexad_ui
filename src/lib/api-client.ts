import { AuthResponse } from '@/types/api';

const API_BASE_URL = (
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api'
).replace(/\/+$/, '');

const ACCESS_KEY = 'hexad_access_token';
const REFRESH_KEY = 'hexad_refresh_token';

type CacheEntry = {
    data: unknown;
    expiresAt: number;
};

const responseCache = new Map<string, CacheEntry>();

export const tokenStorage = {
    getAccess: () =>
        typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null,
    getRefresh: () =>
        typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null,
    setTokens: (access: string, refresh: string) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(ACCESS_KEY, access);
        localStorage.setItem(REFRESH_KEY, refresh);
    },
    clear: () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        responseCache.clear();
    },
};

export function invalidateApiCache(prefix?: string): void {
    if (!prefix) {
        responseCache.clear();
        return;
    }
    for (const key of responseCache.keys()) {
        if (key.includes(prefix)) {
            responseCache.delete(key);
        }
    }
}

export function getCachedApiResponse<T>(endpoint: string): T | null {
    const token = tokenStorage.getAccess() || 'anon';
    const key = `${token}:${endpoint}`;
    const entry = responseCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        return null;
    }
    return entry.data as T;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    const refresh = tokenStorage.getRefresh();
    if (!refresh) return null;

    if (!refreshPromise) {
        refreshPromise = (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh }),
                    cache: 'no-store',
                });
                if (!res.ok) {
                    tokenStorage.clear();
                    return null;
                }
                const data: { access: string; refresh?: string } = await res.json();
                tokenStorage.setTokens(data.access, data.refresh || refresh);
                return data.access;
            } catch {
                tokenStorage.clear();
                return null;
            } finally {
                refreshPromise = null;
            }
        })();
    }
    return refreshPromise;
}

export async function apiFetch<T>(
    endpoint: string,
    options: RequestInit & { skipAuth?: boolean; cacheTtlMs?: number } = {}
): Promise<T> {
    const { skipAuth, cacheTtlMs = 0, headers, ...rest } = options;
    const method = (rest.method || 'GET').toUpperCase();

    // Invalidate related cached GET entries after mutations
    if (method !== 'GET' && method !== 'HEAD') {
        const resourceSegment = endpoint.split('?')[0].split('/')[1];
        if (resourceSegment) {
            invalidateApiCache(`/${resourceSegment}`);
        }
    }

    const token = !skipAuth ? tokenStorage.getAccess() : null;
    const cacheKey = `${token || 'anon'}:${endpoint}`;

    if (method === 'GET' && cacheTtlMs > 0) {
        const cached = responseCache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) {
            return cached.data as T;
        }
    }

    const requestHeaders = new Headers(headers);

    if (!requestHeaders.has('Content-Type') && rest.body) {
        requestHeaders.set('Content-Type', 'application/json');
    }

    if (!skipAuth && token) {
        requestHeaders.set('Authorization', `Bearer ${token}`);
    }

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...rest,
        cache: rest.cache ?? 'no-store',
        headers: requestHeaders,
    });

    if (response.status === 401 && !skipAuth) {
        const newAccess = await refreshAccessToken();
        if (newAccess) {
            requestHeaders.set('Authorization', `Bearer ${newAccess}`);
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...rest,
                cache: rest.cache ?? 'no-store',
                headers: requestHeaders,
            });
        }
    }

    if (!response.ok) {
        let message = `Request failed (${response.status})`;
        try {
            const errData = await response.json();
            message =
                errData.detail ||
                Object.values(errData).flat().join(' ') ||
                message;
        } catch {
            // keep default message
        }
        throw new Error(message);
    }

    if (response.status === 204 || response.status === 205) {
        return undefined as T;
    }

    const jsonData = (await response.json()) as T;

    if (method === 'GET' && cacheTtlMs > 0) {
        responseCache.set(cacheKey, {
            data: jsonData,
            expiresAt: Date.now() + cacheTtlMs,
        });
    }

    return jsonData;
}

export const authApi = {
    login: (email: string, password: string) =>
        apiFetch<AuthResponse>('/auth/login/', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            skipAuth: true,
        }),

    register: (payload: {
        email: string;
        full_name: string;
        password: string;
        timezone?: string;
    }) =>
        apiFetch('/auth/register/', {
            method: 'POST',
            body: JSON.stringify(payload),
            skipAuth: true,
        }),

    googleLogin: (id_token: string) =>
        apiFetch<AuthResponse>('/auth/google/', {
            method: 'POST',
            body: JSON.stringify({ id_token }),
            skipAuth: true,
        }),

    me: () => apiFetch<AuthResponse['user']>('/auth/me/'),

    logout: async () => {
        const refresh = tokenStorage.getRefresh();
        if (refresh) {
            await apiFetch('/auth/logout/', {
                method: 'POST',
                body: JSON.stringify({ refresh }),
            }).catch(() => {});
        }
        tokenStorage.clear();
    },
};