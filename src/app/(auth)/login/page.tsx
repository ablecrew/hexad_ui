'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, Hexagon, Loader2, Shield } from 'lucide-react';
import { GoogleMark } from '@/components/GoogleMark';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const { loginWithEmail, loginWithGoogle } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await loginWithEmail(email, password);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid email or password.');
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
                    href="/signup"
                    className="text-sm font-medium text-[#14221C] hover:text-[#084C36]"
                >
                    Create account
                </Link>
            </header>

            <main className="flex-1 flex items-center justify-center px-4 py-10">
                <div className="w-full max-w-[440px] rounded-2xl border border-[#DFE4D9] bg-white p-8 shadow-xs">
                    <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#111D18]">
                        Welcome back
                    </h1>
                    <p className="mt-1.5 text-sm text-[#5C6962]">
                        Sign in to continue your six-pillar rhythm.
                    </p>

                    {error && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="mt-6 space-y-4">
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
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-medium text-[#14221C]">
                                    Password
                                </label>
                                <span className="text-xs font-medium text-[#084C36]">
                  Forgot password?
                </span>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
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

                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#084C36] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#063A29] disabled:opacity-60 transition"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Sign in to Hexad
                        </button>
                    </form>

                    <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#ECEFE8]" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-white px-2.5 text-[#7A8780]">or</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                            <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#DCE1D6] bg-[#F7F8F4] px-3 py-2.5 text-xs font-medium text-[#14221C] hover:bg-[#EFF2EC] transition">
                                <GoogleMark className="h-4 w-4" />
                                <span>Google</span>
                            </div>
                            <div className="absolute inset-0 opacity-0 overflow-hidden cursor-pointer">
                                <GoogleLogin
                                    onSuccess={async (res) => {
                                        if (!res.credential) return;
                                        setError(null);
                                        try {
                                            await loginWithGoogle(res.credential);
                                        } catch (err) {
                                            setError(
                                                err instanceof Error ? err.message : 'Google sign-in failed.'
                                            );
                                        }
                                    }}
                                    onError={() => setError('Google sign-in was cancelled.')}
                                    width="200"
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setError('Apple Sign-In endpoint is not configured yet.')
                            }
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#DCE1D6] bg-[#F7F8F4] px-3 py-2.5 text-xs font-medium text-[#14221C] hover:bg-[#EFF2EC] transition"
                        >
                            <Shield className="h-4 w-4 text-[#14221C]" />
                            <span>Apple</span>
                        </button>
                    </div>

                    <p className="mt-6 text-center text-xs text-[#5C6962]">
                        New to Hexad?{' '}
                        <Link
                            href="/signup"
                            className="font-semibold text-[#084C36] hover:underline"
                        >
                            Create an account
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}