import { AuthResponse } from '@/types/api';

const API_BASE_URL = (
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api'
).replace(/\/+$/, '');

const ACCESS_KEY = 'hexad_access_token';
const REFRESH_KEY = 'hexad_refresh_token';

export const tokenStorage = {
    getAccess: () =>
        typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null,
    getRefresh: () =>
        typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null,
    setTokens: (access: string, refresh: string) => {
        localStorage.setItem(ACCESS_KEY, access);
        localStorage.setItem(REFRESH_KEY, refresh);
    },
    clear: () => {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
    },
};

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
    options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
    const { skipAuth, headers, ...rest } = options;
    const requestHeaders = new Headers(headers);

    if (!requestHeaders.has('Content-Type') && rest.body) {
        requestHeaders.set('Content-Type', 'application/json');
    }

    if (!skipAuth) {
        const token = tokenStorage.getAccess();
        if (token) {
            requestHeaders.set('Authorization', `Bearer ${token}`);
        }
    }

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...rest,
        headers: requestHeaders,
    });

    if (response.status === 401 && !skipAuth) {
        const newAccess = await refreshAccessToken();
        if (newAccess) {
            requestHeaders.set('Authorization', `Bearer ${newAccess}`);
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...rest,
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

    return response.json();
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