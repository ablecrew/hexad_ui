'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { authApi, tokenStorage } from '@/lib/api-client';
import { UserProfile } from '@/types/api';

interface AuthContextValue {
    user: UserProfile | null;
    loading: boolean;
    loginWithEmail: (email: string, password: string) => Promise<void>;
    registerWithEmail: (
        full_name: string,
        email: string,
        password: string
    ) => Promise<void>;
    loginWithGoogle: (idToken: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const initAuth = async () => {
            const token = tokenStorage.getAccess();
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const profile = await authApi.me();
                setUser(profile);
            } catch {
                tokenStorage.clear();
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, []);

    const loginWithEmail = async (email: string, password: string) => {
        const data = await authApi.login(email, password);
        tokenStorage.setTokens(data.access, data.refresh);
        setUser(data.user);
        router.push('/dashboard');
    };

    const registerWithEmail = async (
        full_name: string,
        email: string,
        password: string
    ) => {
        await authApi.register({
            full_name,
            email,
            password,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Nairobi',
        });
        await loginWithEmail(email, password);
    };

    const loginWithGoogle = async (idToken: string) => {
        const data = await authApi.googleLogin(idToken);
        tokenStorage.setTokens(data.access, data.refresh);
        setUser(data.user);
        router.push('/dashboard');
    };

    const logout = async () => {
        await authApi.logout();
        setUser(null);
        router.push('/login');
    };

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

    return (
        <GoogleOAuthProvider clientId={googleClientId}>
            <AuthContext.Provider
                value={{
                    user,
                    loading,
                    loginWithEmail,
                    registerWithEmail,
                    loginWithGoogle,
                    logout,
                }}
            >
                {children}
            </AuthContext.Provider>
        </GoogleOAuthProvider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}