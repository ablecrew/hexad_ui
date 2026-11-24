'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, Hexagon, Loader2 } from 'lucide-react';
import { GoogleMark } from '@/components/GoogleMark';
import { useAuth } from '@/context/AuthContext';
import { coreApi } from '@/lib/dashboard-api';
import { PILLARS } from '@/lib/pillars';
import { PillarSlug } from '@/types/api';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || '';

export default function SignUpPage() {
    const { registerWithEmail, loginWithGoogle } = useAuth();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [selectedPillars, setSelectedPillars] = useState<PillarSlug[]>([
        'academics',
        'financial',
    ]);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const togglePillar = (slug: PillarSlug) => {
        setSelectedPillars((prev) =>
            prev.includes(slug) ? prev.filter((item) => item !== slug) : [...prev, slug]
        );
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await registerWithEmail(fullName, email, password);
            if (selectedPillars.length > 0) {
                const pillarConfigs = selectedPillars.map((pillar_slug) => ({
                    pillar_slug,
                    is_active: true,
                    target_weight: 1,
                }));
                await coreApi.setPillarFocuses(pillarConfigs).catch(() => {});
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to create account.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9F5] text-[#14221C] flex flex-col">
            <header className="flex h-16 items-center justify-between px-6 sm:px-10">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#084C36] text-white">
                        <Hexagon className="h-5 w-5" />
                    </div>
                    <span className="font-serif text-xl font-semibold text-[#111D18]">
                        Hexad
                    </span>
                </Link>
                <Link
                    href="/login"
                    className="text-sm font-medium text-[#14221C] hover:text-[#084C36]"
                >
                    Sign in
                </Link>
            </header>

            <main className="flex-1 flex items-center justify-center px-4 py-10">
                <div className="w-full max-w-[440px] rounded-2xl border border-[#DFE4D9] bg-white p-8 shadow-xs">
                    <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#111D18]">
                        Create your account
                    </h1>
                    <p className="mt-1.5 text-sm text-[#5C6962]">
                        Start tracking across all six life pillars in under a minute.
                    </p>

                    {error && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSignUp} className="mt-6 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-[#14221C] mb-1.5">
                                Full name
                            </label>
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your full name"
                                className="w-full rounded-lg border border-[#DCE1D6] bg-[#F7F8F4] px-3.5 py-2.5 text-sm text-[#14221C] placeholder-[#8A968F] focus:border-[#084C36] focus:bg-white focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[#14221C] mb-1.5">
                                Email address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full rounded-lg border border-[#DCE1D6] bg-[#F7F8F4] px-3.5 py-2.5 text-sm text-[#14221C] placeholder-[#8A968F] focus:border-[#084C36] focus:bg-white focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[#14221C] mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={8}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 8 characters"
                                    className="w-full rounded-lg border border-[#DCE1D6] bg-[#F7F8F4] px-3.5 py-2.5 pr-10 text-sm text-[#14221C] placeholder-[#8A968F] focus:border-[#084C36] focus:bg-white focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label="Toggle password visibility"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#67746D] hover:text-[#14221C]"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[#14221C] mb-2">
                                Starting pillar focus
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {PILLARS.map((pillar) => {
                                    const active = selectedPillars.includes(pillar.slug);
                                    return (
                                        <button
                                            key={pillar.slug}
                                            type="button"
                                            onClick={() => togglePillar(pillar.slug)}
                                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                                active
                                                    ? 'bg-[#084C36] text-white'
                                                    : 'bg-[#EEF1EA] text-[#4A5750] hover:bg-[#E2E7DC]'
                                            }`}
                                        >
                                            {pillar.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#084C36] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#063A29] disabled:opacity-60 transition"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create Hexad account
                        </button>
                    </form>

                    {GOOGLE_CLIENT_ID && (
                        <>
                            <div className="relative my-5">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[#ECEFE8]" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-white px-2.5 text-[#7A8780]">or</span>
                                </div>
                            </div>

                            <GoogleSignInButton
                                label="Continue with Google"
                                onIdToken={async (idToken) => {
                                    setError(null);
                                    try {
                                        await loginWithGoogle(idToken);
                                    } catch (err) {
                                        setError(
                                            err instanceof Error
                                                ? err.message
                                                : 'Google sign-in failed.'
                                        );
                                    }
                                }}
                                onError={() => setError('Google sign-in was cancelled.')}
                            />
                        </>
                    )}

                    <p className="mt-6 text-center text-xs text-[#5C6962]">
                        Already have an account?{' '}
                        <Link href="/login" className="font-semibold text-[#084C36] hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}

function GoogleSignInButton({
                                label,
                                onIdToken,
                                onError,
                            }: {
    label: string;
    onIdToken: (token: string) => Promise<void>;
    onError: () => void;
}) {
    return (
        <div className="relative w-full">
            <div className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[#DCE1D6] bg-[#F7F8F4] px-4 py-2.5 text-sm font-medium text-[#14221C] hover:bg-[#EFF2EC] transition">
                <GoogleMark className="h-4 w-4" />
                <span>{label}</span>
            </div>
            <div className="absolute inset-0 opacity-0 overflow-hidden cursor-pointer">
                <GoogleCredentialOverlay onIdToken={onIdToken} onError={onError} />
            </div>
        </div>
    );
}

function GoogleCredentialOverlay({
                                     onIdToken,
                                     onError,
                                 }: {
    onIdToken: (token: string) => Promise<void>;
    onError: () => void;
}) {
    return (
        <GoogleLogin
            onSuccess={(res) => {
                if (res.credential) {
                    void onIdToken(res.credential);
                }
            }}
            onError={onError}
            width="400"
        />
    );
}