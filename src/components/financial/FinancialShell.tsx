'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Hexagon,
    LayoutGrid,
    Loader2,
    Plus,
    SlidersHorizontal,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { coreApi } from '@/lib/dashboard-api';
import { PILLARS } from '@/lib/pillars';
import { PillarSlug, UserStreak, WeeklySnapshot } from '@/types/api';

export const FINANCIAL_NAV = [
    { href: '/dashboard/financial', label: 'Budget & Cashflow' },
    { href: '/dashboard/financial/savings-goals', label: 'Savings Goals' },
    { href: '/dashboard/financial/investments', label: 'Investments' },
    { href: '/dashboard/financial/debt-bills', label: 'Debt & Bills' },
    { href: '/dashboard/financial/spending-habits', label: 'Spending Habits' },
];

interface FinancialShellProps {
    subtitle: string;
    ctaLabel: string;
    onCtaClick: () => void;
    error?: string | null;
    children: React.ReactNode;
}

export function FinancialShell({
                                   subtitle,
                                   ctaLabel,
                                   onCtaClick,
                                   error,
                                   children,
                               }: FinancialShellProps) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const [streak, setStreak] = useState<UserStreak | null>(null);
    const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;
        void Promise.all([
            coreApi.getStreaks().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            coreApi.getSnapshots().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
        ]).then(([streakRes, snapRes]) => {
            setStreak(streakRes.results[0] ?? null);
            setSnapshots(snapRes.results);
        });
    }, [user]);

    const latestPillarScores = useMemo(() => {
        const map: Partial<Record<PillarSlug, number>> = {};
        for (const snap of snapshots) {
            if (map[snap.pillar_slug] === undefined) {
                map[snap.pillar_slug] = snap.score_pct;
            }
        }
        return map;
    }, [snapshots]);

    if (authLoading || (!user && !authLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAF7]">
                <Loader2 className="h-6 w-6 animate-spin text-[#004635]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-[#F8FAF7] text-[#2E312F]">
            {/* Left Sidebar */}
            <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-[#BFC9C3]/60 bg-[#FBFBF8] p-4">
                <div>
                    <Link href="/dashboard" className="flex items-center gap-2.5 px-2 py-2 mb-6">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#004635] text-white">
                            <Hexagon className="h-5 w-5" />
                        </div>
                        <div className="leading-tight">
                            <div className="text-sm font-semibold text-[#14221C]">Hexad</div>
                            <div className="text-[11px] text-[#707974]">Personal Progress</div>
                        </div>
                    </Link>

                    <div className="text-[10px] font-semibold tracking-wider text-[#707974] px-3 mb-2">
                        OVERVIEW
                    </div>
                    <div className="space-y-1">
                        <Link
                            href="/dashboard"
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#3A4740] hover:bg-[#ECEEEB] transition"
                        >
                            <LayoutGrid className="h-4 w-4 text-[#707974]" />
                            Dashboard
                        </Link>
                        <Link
                            href="/dashboard/weekly-insights"
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#3A4740] hover:bg-[#ECEEEB] transition"
                        >
                            <TrendingUp className="h-4 w-4 text-[#707974]" />
                            Weekly Insights
                        </Link>
                    </div>

                    <div className="text-[10px] font-semibold tracking-wider text-[#707974] px-3 mt-6 mb-2">
                        LIFE PILLARS
                    </div>
                    <div className="space-y-1">
                        {PILLARS.map(({ slug, label, Icon }) => {
                            const isActive = pathname?.startsWith(`/dashboard/${slug}`);
                            const href =
                                slug === 'academics'
                                    ? '/dashboard/academics'
                                    : slug === 'financial'
                                        ? '/dashboard/financial'
                                        : slug === 'spiritual'
                                            ? '/dashboard/spiritual'
                                            : slug === 'mental'
                                                ? '/dashboard/mental'
                                                : slug === 'physical'
                                                    ? '/dashboard/physical'
                                                    : '/dashboard/emotional';

                            return (
                                <Link
                                    key={slug}
                                    href={href}
                                    prefetch
                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                                        isActive
                                            ? 'bg-[#8F4A00] font-semibold text-white'
                                            : 'font-medium text-[#3A4740] hover:bg-[#ECEEEB]'
                                    }`}
                                >
        <span className="flex items-center gap-2.5">
          <Icon
              className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#707974]'}`}
          />
            {label}
        </span>
                                    <span
                                        className={`font-mono text-[11px] ${
                                            isActive ? 'text-white/90' : 'text-[#707974]'
                                        }`}
                                    >
          {latestPillarScores[slug] ?? 0}%
        </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom User Profile */}
                <div className="border-t border-[#BFC9C3]/60 pt-3">
                    <div className="flex items-center justify-between px-2 py-1.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#96F7B8] text-xs font-semibold text-[#006D3E]">
                                {user?.initials || 'HX'}
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-xs font-semibold text-[#14221C]">
                                    {user?.full_name}
                                </div>
                                <div className="font-mono text-[11px] text-[#707974]">
                                    {streak?.current_streak_days ?? 0}-day streak
                                </div>
                            </div>
                        </div>
                        <SlidersHorizontal className="h-4 w-4 text-[#707974]" />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 px-5 py-6 sm:px-8 max-w-6xl mx-auto w-full">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4A5750] hover:text-[#14221C] transition"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Dashboard
                </Link>

                <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3.5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#96F7B8] text-[#006D3E]">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="font-serif text-3xl font-semibold text-[#111D18]">
                                Financial
                            </h1>
                            <p className="text-xs text-[#707974] mt-0.5">{subtitle}</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onCtaClick}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#1B5E4B] transition shrink-0"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        {ctaLabel}
                    </button>
                </div>

                {/* Dedicated Route Sub-Tabs */}
                <nav
                    aria-label="Financial sections"
                    className="mt-6 inline-flex flex-wrap items-center gap-1 rounded-xl border border-[#ECEEEB] bg-[#ECEEEB]/80 p-1"
                >
                    {FINANCIAL_NAV.map((item) => {
                        const active = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`rounded-lg px-3.5 py-1.5 text-xs transition ${
                                    active
                                        ? 'bg-white font-semibold text-[#111D18] shadow-2xs'
                                        : 'font-medium text-[#4A5750] hover:text-[#14221C]'
                                }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {error && (
                    <div className="mt-4 rounded-lg border border-[#BA1A1A]/30 bg-[#FFDAD6] px-4 py-2.5 text-xs text-[#BA1A1A]">
                        {error}
                    </div>
                )}

                {children}
            </main>
        </div>
    );
}