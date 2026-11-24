'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Hexagon,
    LayoutGrid,
    Loader2,
    Moon,
    PiggyBank,
    Plus,
    SlidersHorizontal,
    Sparkles,
    TrendingUp,
    X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { coreApi, PillarCheckin } from '@/lib/dashboard-api';
import { PILLARS } from '@/lib/pillars';
import {
    DailyHabit,
    HabitLog,
    PillarSlug,
    UserStreak,
    WeeklySnapshot,
} from '@/types/api';

type WindowRange = '7d' | '30d' | '90d';

export default function WeeklyInsightsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [range, setRange] = useState<WindowRange>('7d');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [streak, setStreak] = useState<UserStreak | null>(null);
    const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([]);
    const [habits, setHabits] = useState<DailyHabit[]>([]);
    const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
    const [checkins, setCheckins] = useState<PillarCheckin[]>([]);

    // + Create new goal modal
    const [goalModalOpen, setGoalModalOpen] = useState(false);
    const [goalPillar, setGoalPillar] = useState<PillarSlug>('financial');
    const [goalTitle, setGoalTitle] = useState('');
    const [goalCadence, setGoalCadence] = useState<
        'daily' | 'weekly' | 'monthly' | 'quarterly'
    >('weekly');
    const [goalTarget, setGoalTarget] = useState('100');
    const [goalUnit, setGoalUnit] = useState('%');
    const [submittingGoal, setSubmittingGoal] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login');
        }
    }, [authLoading, user, router]);

    const loadInsights = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [streakRes, snapRes, habitsRes, logsRes, checkinsRes] =
                await Promise.all([
                    coreApi.getStreaks().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                    coreApi.getSnapshots().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                    coreApi.getHabits().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                    coreApi.getHabitLogsByDate(new Date().toISOString().slice(0, 10)).catch(() => ({
                        count: 0,
                        next: null,
                        previous: null,
                        results: [],
                    })),
                    coreApi.getCheckins().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                ]);
            setStreak(streakRes.results[0] ?? null);
            setSnapshots(snapRes.results);
            setHabits(habitsRes.results);
            setHabitLogs(logsRes.results);
            setCheckins(checkinsRes.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load weekly insights.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadInsights();
    }, [loadInsights]);

    const latestPillarScores = useMemo(() => {
        const map: Partial<Record<PillarSlug, number>> = {};
        for (const snap of snapshots) {
            if (map[snap.pillar_slug] === undefined) {
                map[snap.pillar_slug] = snap.score_pct;
            }
        }
        return map;
    }, [snapshots]);

    const rankedPillars = useMemo(() => {
        return [...PILLARS]
            .map((p) => ({
                ...p,
                score: latestPillarScores[p.slug] ?? 0,
            }))
            .sort((a, b) => b.score - a.score);
    }, [latestPillarScores]);

    const compositeScore = useMemo(() => {
        if (rankedPillars.length === 0) return '0.0';
        const avg =
            rankedPillars.reduce((acc, p) => acc + p.score, 0) / rankedPillars.length;
        return avg.toFixed(1);
    }, [rankedPillars]);

    const leadingPillar = rankedPillars[0];

    const handleCreateGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!goalTitle.trim()) return;
        setSubmittingGoal(true);
        try {
            await coreApi.createGoal({
                pillar_slug: goalPillar,
                title: goalTitle.trim(),
                cadence: goalCadence,
                target_value: Math.max(1, Number(goalTarget) || 100),
                current_value: 0,
                unit: goalUnit.trim() || '%',
            });
            setGoalTitle('');
            setGoalModalOpen(false);
            await loadInsights();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to create goal.');
        } finally {
            setSubmittingGoal(false);
        }
    };

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
                            className="flex w-full items-center gap-2.5 rounded-lg bg-[#E6F2EC] px-3 py-2 text-xs font-semibold text-[#004635]"
                        >
                            <TrendingUp className="h-4 w-4 text-[#004635]" />
                            Weekly Insights
                        </Link>
                    </div>

                    <div className="text-[10px] font-semibold tracking-wider text-[#707974] px-3 mt-6 mb-2">
                        LIFE PILLARS
                    </div>
                    <div className="space-y-1">
                        {PILLARS.map(({ slug, label, Icon }) => {
                            const href =
                                slug === 'academics'
                                    ? '/dashboard/academics'
                                    : slug === 'financial'
                                        ? '/dashboard/financial'
                                        : `/dashboard?pillar=${slug}`;
                            return (
                                <Link
                                    key={slug}
                                    href={href}
                                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-[#3A4740] hover:bg-[#ECEEEB] transition"
                                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-[#707974]" />
                      {label}
                  </span>
                                    <span className="font-mono text-[11px] text-[#707974]">
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
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6F2EC] text-xs font-semibold text-[#004635]">
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
            <main className="flex-1 px-5 py-7 sm:px-8 max-w-6xl mx-auto w-full">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <div className="font-mono text-xs text-[#707974]">
                            {range === '7d'
                                ? 'Last 7 Days · Weekly Cadence'
                                : range === '30d'
                                    ? 'Last 30 Days · Monthly Cadence'
                                    : 'Last 90 Days · Quarterly Cadence'}
                        </div>
                        <h1 className="font-serif text-3xl font-semibold text-[#111D18] mt-1">
                            Weekly Insights &amp; Trends
                        </h1>
                        <p className="text-xs text-[#707974] mt-1">
                            Cross-pillar momentum, habit consistency, and new goal creation.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <div className="inline-flex items-center rounded-xl border border-[#ECEEEB] bg-[#ECEEEB]/80 p-1">
                            {(
                                [
                                    { id: '7d', label: '7 Days' },
                                    { id: '30d', label: '30 Days' },
                                    { id: '90d', label: '90 Days' },
                                ] as { id: WindowRange; label: string }[]
                            ).map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setRange(item.id)}
                                    className={`rounded-lg px-3 py-1.5 text-xs transition ${
                                        range === item.id
                                            ? 'bg-white font-semibold text-[#111D18] shadow-2xs'
                                            : 'font-medium text-[#4A5750] hover:text-[#14221C]'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setGoalModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] transition"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Create new goal
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-lg border border-[#BA1A1A]/30 bg-[#FFDAD6] px-4 py-2.5 text-xs text-[#BA1A1A]">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="mt-14 flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-[#004635]" />
                    </div>
                ) : (
                    <>
                        {/* Top 3 Summary Cards */}
                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                                <div className="text-xs text-[#707974]">Composite Growth Score</div>
                                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold text-[#006D3E]">
                    {compositeScore}
                  </span>
                                    <span className="font-mono text-xs text-[#006D3E]">
                    {snapshots.length} snapshots
                  </span>
                                </div>
                                <div className="mt-1 text-xs text-[#707974]">
                                    Weighted across {rankedPillars.length} life pillars
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                                <div className="text-xs text-[#707974]">Leading Pillar</div>
                                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-serif text-2xl font-semibold text-[#006D3E]">
                    {leadingPillar?.label ?? '—'}
                  </span>
                                    <span className="font-mono text-sm font-semibold text-[#006D3E]">
                    {leadingPillar?.score ?? 0}%
                  </span>
                                </div>
                                <div className="mt-1 text-xs text-[#707974]">
                                    {rankedPillars[1]
                                        ? `Followed by ${rankedPillars[1].label} (${rankedPillars[1].score}%)`
                                        : 'Log check-ins to rank pillars'}
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                                <div className="text-xs text-[#707974]">Habits &amp; Check-ins</div>
                                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold text-[#111D18]">
                    {habitLogs.filter((l) => l.completed).length} / {habits.length}
                  </span>
                                    <span className="text-xs text-[#707974]">
                    {checkins.length} check-ins
                  </span>
                                </div>
                                <div className="mt-1 text-xs text-[#707974]">
                                    Current streak: {streak?.current_streak_days ?? 0} days
                                </div>
                            </div>
                        </div>

                        {/* Bottom Two-Column Section */}
                        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                            <div className="lg:col-span-7">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                    Pillar Momentum (Week-over-Week)
                                </h2>
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5 space-y-4">
                                    {rankedPillars.map((pillar) => (
                                        <div key={pillar.slug}>
                                            <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-[#14221C]">
                          {pillar.label}
                        </span>
                                                <span className={`font-mono font-semibold ${pillar.badgeText}`}>
                          {pillar.score}%
                        </span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-[#ECEEEB]">
                                                <div
                                                    className={`h-full rounded-full ${pillar.barColor}`}
                                                    style={{ width: `${Math.min(100, Math.max(0, pillar.score))}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="lg:col-span-5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                    Cross-Pillar Patterns
                                </h2>
                                <div className="space-y-3.5">
                                    <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-4 flex items-start gap-3.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFDDB8] text-[#885200]">
                                            <Moon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-[#14221C]">
                                                Recovery &amp; Focus Rhythm
                                            </div>
                                            <p className="text-xs text-[#707974] mt-0.5">
                                                Physical energy and Academics output are tracked together across your weekly snapshots.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-4 flex items-start gap-3.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7AF8DA] text-[#006B5A]">
                                            <Sparkles className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-[#14221C]">
                                                Stillness &amp; Mood Balance
                                            </div>
                                            <p className="text-xs text-[#707974] mt-0.5">
                                                Consistent Emotional and Mental check-ins keep your weekly pillar balance steady.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-4 flex items-start gap-3.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#96F7B8] text-[#006D3E]">
                                            <PiggyBank className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-[#14221C]">
                                                Habit &amp; Spend Discipline
                                            </div>
                                            <p className="text-xs text-[#707974] mt-0.5">
                                                Daily routine adherence pairs with Financial caps to compound weekly consistency.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Create New Goal Modal */}
            {goalModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Create new goal
                            </h3>
                            <button
                                type="button"
                                onClick={() => setGoalModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateGoal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Pillar
                                </label>
                                <select
                                    value={goalPillar}
                                    onChange={(e) => setGoalPillar(e.target.value as PillarSlug)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                >
                                    {PILLARS.map((p) => (
                                        <option key={p.slug} value={p.slug}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Goal Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={goalTitle}
                                    onChange={(e) => setGoalTitle(e.target.value)}
                                    placeholder="e.g., Build Ksh 200,000 reserve"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Cadence
                                    </label>
                                    <select
                                        value={goalCadence}
                                        onChange={(e) =>
                                            setGoalCadence(
                                                e.target.value as 'daily' | 'weekly' | 'monthly' | 'quarterly'
                                            )
                                        }
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Target
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        required
                                        value={goalTarget}
                                        onChange={(e) => setGoalTarget(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Unit
                                    </label>
                                    <input
                                        type="text"
                                        value={goalUnit}
                                        onChange={(e) => setGoalUnit(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setGoalModalOpen(false)}
                                    className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingGoal}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {submittingGoal && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Create goal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}