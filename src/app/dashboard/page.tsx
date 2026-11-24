'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    CheckCircle2,
    Circle,
    Flame,
    Hexagon,
    LayoutGrid,
    Loader2,
    LogOut,
    Menu,
    Plus,
    ShieldCheck,
    Sparkles,
    Timer,
    TrendingUp,
    X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
    AcademicsSummary,
    coreApi,
    EmotionalSummary,
    FinancialSummary,
    MentalSummary,
    PhysicalSummary,
    pillarSummariesApi,
    SpiritualSummary,
} from '@/lib/dashboard-api';
import { PILLARS } from '@/lib/pillars';
import { getUserAvatarPalette, isAdminUser } from '@/lib/rbac';
import {
    DailyHabit,
    HabitLog,
    PillarGoal,
    PillarSlug,
    UserStreak,
    WeeklySnapshot,
} from '@/types/api';
import { HexadRadarChart, PillarScore } from '@/components/HexadRadarChart';
import { BaselineQuizModal } from '@/components/BaselineQuizModal';

const BASELINE_STORAGE_KEY = 'hexad_baseline_scores_v1';

function formatLocalDate(d: Date, timeZone?: string): string {
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: timeZone || 'Africa/Nairobi',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(d);
        const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
        const month = parts.find((p) => p.type === 'month')?.value ?? '01';
        const day = parts.find((p) => p.type === 'day')?.value ?? '01';
        return `${year}-${month}-${day}`;
    } catch {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

function getTimeOfDayGreeting(d: Date, timeZone?: string): string {
    let hour = d.getHours();
    try {
        const hourStr = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone || 'Africa/Nairobi',
            hour: 'numeric',
            hour12: false,
        }).format(d);
        const parsed = Number(hourStr);
        if (!Number.isNaN(parsed)) {
            hour = parsed % 24;
        }
    } catch {
        // fallback to device local hour
    }

    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function formatKsh(val: string | number | undefined): string {
    const num = Number(val ?? 0);
    return `Ksh ${num.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

function computeTargetWeight(rating: number): number {
    const clamped = Math.max(1, Math.min(10, Math.round(rating)));
    return 11 - clamped;
}

const PILLAR_ROUTES: Partial<Record<PillarSlug, string>> = {
    academics: '/dashboard/academics',
    financial: '/dashboard/financial',
    spiritual: '/dashboard/spiritual',
    mental: '/dashboard/mental',
    physical: '/dashboard/physical',
    emotional: '/dashboard/emotional',
};

export default function DashboardPage() {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [todayStr, setTodayStr] = useState<string>('');
    const [greeting, setGreeting] = useState<string>('Welcome');
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [streak, setStreak] = useState<UserStreak | null>(null);
    const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([]);
    const [habits, setHabits] = useState<DailyHabit[]>([]);
    const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
    const [goals, setGoals] = useState<PillarGoal[]>([]);

    const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
    const [academicsSummary, setAcademicsSummary] = useState<AcademicsSummary | null>(null);
    const [emotionalSummary, setEmotionalSummary] = useState<EmotionalSummary | null>(null);
    const [spiritualSummary, setSpiritualSummary] = useState<SpiritualSummary | null>(null);
    const [mentalSummary, setMentalSummary] = useState<MentalSummary | null>(null);
    const [physicalSummary, setPhysicalSummary] = useState<PhysicalSummary | null>(null);

    const [focusSeconds, setFocusSeconds] = useState(25 * 60);
    const [focusRunning, setFocusRunning] = useState(false);

    const [checkinOpen, setCheckinOpen] = useState(false);
    const [checkinPillar, setCheckinPillar] = useState<PillarSlug>('academics');
    const [checkinTitle, setCheckinTitle] = useState('');
    const [checkinNote, setCheckinNote] = useState('');
    const [checkinSubmitting, setCheckinSubmitting] = useState(false);

    const [habitFormOpen, setHabitFormOpen] = useState(false);
    const [habitTitle, setHabitTitle] = useState('');
    const [habitPillar, setHabitPillar] = useState<PillarSlug>('academics');
    const [habitScheduledTime, setHabitScheduledTime] = useState('');
    const [habitSubmitting, setHabitSubmitting] = useState(false);

    const [baselineScores, setBaselineScores] = useState<PillarScore[]>(() =>
        PILLARS.map((p) => ({ slug: p.slug, current: 5, target: 8 }))
    );
    const [quizOpen, setQuizOpen] = useState(false);

    useEffect(() => {
        const tz = user?.timezone || 'Africa/Nairobi';
        const syncClock = () => {
            const now = new Date();
            setTodayStr(formatLocalDate(now, tz));
            setGreeting(getTimeOfDayGreeting(now, tz));
        };

        syncClock();
        const interval = setInterval(syncClock, 60_000);
        return () => clearInterval(interval);
    }, [user?.timezone]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!focusRunning) return;
        const timer = setInterval(() => {
            setFocusSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [focusRunning]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(BASELINE_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as PillarScore[];
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setBaselineScores(parsed);
                }
            }
        } catch {
            // ignore storage errors
        }
    }, []);

    const loadDashboard = useCallback(async () => {
        if (!user || !todayStr) return;
        setLoadingData(true);
        setError(null);
        try {
            const [
                streakRes,
                snapRes,
                habitsRes,
                logsRes,
                goalsRes,
                finRes,
                acadRes,
                emoRes,
                spirRes,
                mentRes,
                physRes,
            ] = await Promise.all([
                coreApi.getStreaks().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                coreApi.getSnapshots().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                coreApi.getHabits().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                coreApi.getHabitLogsByDate(todayStr).catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                coreApi.getGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                pillarSummariesApi.financial().catch(() => null),
                pillarSummariesApi.academics().catch(() => null),
                pillarSummariesApi.emotional().catch(() => null),
                pillarSummariesApi.spiritual().catch(() => null),
                pillarSummariesApi.mental().catch(() => null),
                pillarSummariesApi.physical().catch(() => null),
            ]);

            setStreak(streakRes.results[0] ?? null);
            setSnapshots(snapRes.results);
            setHabits(habitsRes.results);
            setHabitLogs(logsRes.results);
            setGoals(goalsRes.results);
            setFinancialSummary(finRes);
            setAcademicsSummary(acadRes);
            setEmotionalSummary(emoRes);
            setSpiritualSummary(spirRes);
            setMentalSummary(mentRes);
            setPhysicalSummary(physRes);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
        } finally {
            setLoadingData(false);
        }
    }, [user, todayStr]);

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    const latestPillarScores = useMemo(() => {
        const map: Partial<Record<PillarSlug, number>> = {};
        for (const snap of snapshots) {
            if (map[snap.pillar_slug] === undefined) {
                map[snap.pillar_slug] = snap.score_pct;
            }
        }
        return map;
    }, [snapshots]);

    const radarScores = useMemo<PillarScore[]>(() => {
        return PILLARS.map((pillar) => {
            const snapScore = latestPillarScores[pillar.slug];
            const base = baselineScores.find((b) => b.slug === pillar.slug);
            const current =
                typeof snapScore === 'number' && snapScore > 0
                    ? Math.max(1, Math.min(10, Math.round(snapScore / 10)))
                    : base?.current ?? 5;
            return {
                slug: pillar.slug,
                current,
                target: base?.target ?? 8,
            };
        });
    }, [latestPillarScores, baselineScores]);

    const handleSaveBaseline = async (updatedScores: PillarScore[]) => {
        setBaselineScores(updatedScores);
        try {
            localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(updatedScores));
        } catch {
            // ignore storage errors
        }

        const pillarConfigs = updatedScores.map((item) => ({
            pillar_slug: item.slug,
            is_active: true,
            target_weight: computeTargetWeight(item.current),
        }));
        await coreApi.setPillarFocuses(pillarConfigs).catch(() => {});
    };

    const overallBalancePct = useMemo(() => {
        const scores = PILLARS.map((p) => latestPillarScores[p.slug] ?? 0);
        const sum = scores.reduce((acc, v) => acc + v, 0);
        return Math.round(sum / PILLARS.length);
    }, [latestPillarScores]);

    const completedHabitIds = useMemo(() => {
        return new Set(
            habitLogs.filter((l) => l.completed).map((l) => l.habit)
        );
    }, [habitLogs]);

    const toggleHabit = async (habit: DailyHabit) => {
        const tz = user?.timezone || 'Africa/Nairobi';
        const logDate = todayStr || formatLocalDate(new Date(), tz);
        const existingLog = habitLogs.find((l) => l.habit === habit.id);
        const nextCompleted = !existingLog?.completed;
        try {
            if (existingLog) {
                await coreApi.patchHabitLog(existingLog.id, {
                    completed: nextCompleted,
                    completed_at: nextCompleted ? new Date().toISOString() : null,
                });
            } else {
                await coreApi.createHabitLog({
                    habit: habit.id,
                    log_date: logDate,
                    completed: nextCompleted,
                    completed_at: nextCompleted ? new Date().toISOString() : undefined,
                });
            }
            await loadDashboard();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to update habit.');
        }
    };

    const handleCreateHabit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!habitTitle.trim()) return;
        setHabitSubmitting(true);
        setError(null);
        try {
            await coreApi.createHabit({
                title: habitTitle.trim(),
                pillar_slug: habitPillar,
                scheduled_time: habitScheduledTime || undefined,
            });
            setHabitTitle('');
            setHabitScheduledTime('');
            setHabitFormOpen(false);
            await loadDashboard();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to create habit.');
        } finally {
            setHabitSubmitting(false);
        }
    };

    const handleCheckinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkinTitle.trim()) return;
        setCheckinSubmitting(true);
        try {
            await coreApi.createCheckin({
                pillar_slug: checkinPillar,
                title: checkinTitle.trim(),
                note: checkinNote.trim() || undefined,
            });
            setCheckinTitle('');
            setCheckinNote('');
            setCheckinOpen(false);
            await loadDashboard();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to log check-in.');
        } finally {
            setCheckinSubmitting(false);
        }
    };

    const handlePillarNavigateOrCheckin = (slug: PillarSlug) => {
        setMobileMenuOpen(false);
        const route = PILLAR_ROUTES[slug];
        if (route) {
            router.push(route);
            return;
        }
        setCheckinPillar(slug);
        setCheckinOpen(true);
    };

    const getPillarMetricLine = (slug: PillarSlug): string => {
        switch (slug) {
            case 'academics':
                return academicsSummary
                    ? `${academicsSummary.total_exam_prep_mins}m prep · ${academicsSummary.pending_assignments_count} pending`
                    : 'No academic logs yet';
            case 'emotional':
                return emotionalSummary
                    ? `${emotionalSummary.journal_entries_count} reflections · ${emotionalSummary.active_boundaries_count} boundaries`
                    : 'No emotional logs yet';
            case 'spiritual':
                return spiritualSummary
                    ? `${spiritualSummary.total_breath_mins}m breathwork · ${spiritualSummary.gratitude_entries_count} gratitude`
                    : 'No spiritual logs yet';
            case 'mental':
                return mentalSummary
                    ? `${mentalSummary.total_detox_mins}m detox · ${mentalSummary.cognitive_notes_count} notes`
                    : 'No mental logs yet';
            case 'physical':
                return physicalSummary
                    ? `${physicalSummary.average_sleep_hrs ?? 0}h avg sleep · ${physicalSummary.total_steps.toLocaleString()} steps`
                    : 'No physical logs yet';
            case 'financial':
                return financialSummary
                    ? `Net ${formatKsh(financialSummary.net_worth_ksh)}`
                    : 'No financial summary yet';
        }
    };

    const getPillarFooterLine = (slug: PillarSlug): string => {
        const activeGoals = goals.filter(
            (g) => g.pillar_slug === slug && g.status === 'active'
        );
        if (activeGoals.length > 0) {
            return `Active goal: ${activeGoals[0].title}`;
        }
        return 'No active goal set';
    };

    if (authLoading || (!user && !authLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAF7]">
                <Loader2 className="h-6 w-6 animate-spin text-[#004635]" />
            </div>
        );
    }

    const firstName = user?.full_name?.split(' ')[0] || 'there';
    const focusMins = String(Math.floor(focusSeconds / 60)).padStart(2, '0');
    const focusSecs = String(focusSeconds % 60).padStart(2, '0');
    const showAdminLink = isAdminUser(user);
    const avatarStyle = getUserAvatarPalette(user?.email || user?.id);

    const renderSidebarContent = () => (
        <>
            <div className="overflow-y-auto pr-0.5">
                <Link
                    href="/dashboard"
                    prefetch
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-2 py-2 mb-5"
                >
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
                    <button
                        type="button"
                        onClick={() => {
                            setMobileMenuOpen(false);
                            void loadDashboard();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg bg-[#E6F2EC] px-3 py-2.5 lg:py-2 text-xs font-semibold text-[#004635]"
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Dashboard
                    </button>
                    <Link
                        href="/dashboard/weekly-insights"
                        prefetch
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 lg:py-2 text-xs font-medium text-[#4A5750] hover:bg-[#ECEEEB] transition"
                    >
                        <TrendingUp className="h-4 w-4" />
                        Weekly Insights
                    </Link>
                    {showAdminLink && (
                        <Link
                            href="/admin"
                            prefetch
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 lg:py-2 text-xs font-medium text-[#4A5750] hover:bg-[#ECEEEB] transition"
                        >
                            <ShieldCheck className="h-4 w-4" />
                            Admin Console
                        </Link>
                    )}
                </div>

                <div className="text-[10px] font-semibold tracking-wider text-[#707974] px-3 mt-5 mb-2">
                    LIFE PILLARS
                </div>
                <div className="space-y-1">
                    {PILLARS.map(({ slug, label, Icon }) => {
                        const route = PILLAR_ROUTES[slug];
                        if (route) {
                            return (
                                <Link
                                    key={slug}
                                    href={route}
                                    prefetch
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 lg:py-2 text-xs font-medium text-[#3A4740] hover:bg-[#ECEEEB] transition"
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
                        }

                        return (
                            <button
                                key={slug}
                                type="button"
                                onClick={() => handlePillarNavigateOrCheckin(slug)}
                                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 lg:py-2 text-xs font-medium text-[#3A4740] hover:bg-[#ECEEEB] transition"
                            >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-[#707974]" />
                    {label}
                </span>
                                <span className="font-mono text-[11px] text-[#707974]">
                  {latestPillarScores[slug] ?? 0}%
                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="border-t border-[#BFC9C3]/60 pt-3 mt-3">
                <div className="flex items-center justify-between px-2 py-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                            style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.text }}
                        >
                            {user?.initials || 'HX'}
                        </div>
                        <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-[#14221C]">
                                {user?.full_name}
                            </div>
                            <div className="text-[11px] text-[#707974]">
                                {streak?.current_streak_days ?? 0}-day streak
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => void logout()}
                        title="Sign out"
                        className="rounded-lg p-2 text-[#707974] hover:bg-[#ECEEEB] hover:text-[#14221C]"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAF7] text-[#2E312F]">
            {/* Mobile Top Bar */}
            <header className="sticky top-0 z-30 flex lg:hidden items-center justify-between border-b border-[#BFC9C3]/60 bg-[#FBFBF8] px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        aria-label="Open menu"
                        className="rounded-lg p-2 text-[#14221C] hover:bg-[#ECEEEB]"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <Link href="/dashboard" prefetch className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#004635] text-white">
                            <Hexagon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold text-[#14221C]">Hexad</span>
                    </Link>
                </div>

                <button
                    type="button"
                    onClick={() => setCheckinOpen(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#004635] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1B5E4B]"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Check-in
                </button>
            </header>

            {/* Mobile Drawer */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex lg:hidden">
                    <div
                        className="fixed inset-0 bg-black/35"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <aside className="relative z-10 flex w-72 max-w-[82vw] flex-col justify-between bg-[#FBFBF8] p-4 shadow-xl">
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            aria-label="Close menu"
                            className="absolute right-3 top-3 rounded-lg p-1.5 text-[#707974] hover:bg-[#ECEEEB]"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        {renderSidebarContent()}
                    </aside>
                </div>
            )}

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-[#BFC9C3]/60 bg-[#FBFBF8] p-4">
                {renderSidebarContent()}
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 px-4 py-5 sm:px-8 sm:py-7 max-w-6xl mx-auto w-full">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="font-mono text-xs text-[#707974]">
                            {todayStr || '\u00A0'}
                        </div>
                        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#111D18] mt-0.5">
                            {greeting}, {firstName}
                        </h1>
                        <p className="text-xs text-[#707974] mt-1">
                            Live data synced from your Hexad account. Select any pillar to log a check-in.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => setQuizOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#BFC9C3] bg-white px-3 py-2.5 sm:py-2 text-xs font-medium text-[#14221C] hover:bg-[#ECEEEB]"
                        >
                            <Sparkles className="h-3.5 w-3.5 text-[#004635]" />
                            <span>Baseline Quiz</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFocusRunning((r) => !r)}
                            className="inline-flex flex-1 sm:flex-initial justify-center items-center gap-2 rounded-lg border border-[#BFC9C3] bg-white px-3.5 py-2.5 sm:py-2 text-xs font-medium text-[#14221C] hover:bg-[#ECEEEB]"
                        >
                            <Timer className="h-3.5 w-3.5 text-[#004635]" />
                            <span className="font-mono">
                {focusMins}:{focusSecs}
              </span>
                            <span>{focusRunning ? 'Pause' : 'Focus'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCheckinOpen(true)}
                            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B]"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Log check-in
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-lg border border-[#BA1A1A]/30 bg-[#FFDAD6] px-4 py-2.5 text-xs text-[#BA1A1A]">
                        {error}
                    </div>
                )}

                {loadingData ? (
                    <div className="mt-12 flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-[#004635]" />
                    </div>
                ) : (
                    <>
                        <div className="mt-6 grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-3">
                            <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-4 sm:p-5">
                                <div className="flex items-center justify-between text-xs text-[#707974]">
                                    <span>Overall balance</span>
                                    <TrendingUp className="h-4 w-4 text-[#004635]" />
                                </div>
                                <div className="mt-2 font-serif text-2xl sm:text-3xl font-semibold text-[#111D18]">
                                    {overallBalancePct}%
                                </div>
                                <div className="mt-1 text-xs text-[#707974]">
                                    Average across {PILLARS.length} life pillars
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-4 sm:p-5">
                                <div className="flex items-center justify-between text-xs text-[#707974]">
                                    <span>Consistency streak</span>
                                    <Flame className="h-4 w-4 text-[#974722]" />
                                </div>
                                <div className="mt-2 font-serif text-2xl sm:text-3xl font-semibold text-[#111D18]">
                                    {streak?.current_streak_days ?? 0} days
                                </div>
                                <div className="mt-1 text-xs text-[#707974]">
                                    Personal best: {streak?.longest_streak_days ?? 0} days
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-4 sm:p-5">
                                <div className="flex items-center justify-between text-xs text-[#707974]">
                                    <span>Today&apos;s habits</span>
                                    <span className="rounded-full bg-[#E6F2EC] px-2.5 py-0.5 text-[11px] font-medium text-[#004635]">
                    {habits.length > 0 && completedHabitIds.size === habits.length
                        ? 'Completed'
                        : 'Active'}
                  </span>
                                </div>
                                <div className="mt-2 font-serif text-2xl sm:text-3xl font-semibold text-[#111D18]">
                                    {completedHabitIds.size} / {habits.length}
                                </div>
                                <div className="mt-1 text-xs text-[#707974]">logged so far today</div>
                            </div>
                        </div>

                        <div className="mt-7 sm:mt-8 flex items-baseline justify-between gap-2">
                            <div>
                                <h2 className="font-serif text-lg sm:text-xl font-semibold text-[#111D18]">
                                    Life Pillars
                                </h2>
                                <p className="text-xs text-[#707974]">
                                    Click any card to open its workspace or log a check-in.
                                </p>
                            </div>
                            <span className="text-xs text-[#707974] shrink-0">6 active dimensions</span>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {PILLARS.map((pillar) => {
                                const score = latestPillarScores[pillar.slug] ?? 0;
                                const Icon = pillar.Icon;
                                return (
                                    <button
                                        key={pillar.slug}
                                        type="button"
                                        onClick={() => handlePillarNavigateOrCheckin(pillar.slug)}
                                        className="text-left rounded-xl border border-[#BFC9C3]/70 bg-white p-4 sm:p-5 hover:border-[#004635]/50 transition"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${pillar.badgeBg} ${pillar.badgeText}`}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-[#14221C]">
                                                        {pillar.label}
                                                    </div>
                                                    <div className="truncate text-xs text-[#707974]">
                                                        {getPillarMetricLine(pillar.slug)}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`font-mono text-xs font-semibold shrink-0 ${pillar.badgeText}`}>
                        {score}% →
                      </span>
                                        </div>

                                        <div className="mt-3.5 flex flex-wrap gap-1.5">
                                            {pillar.subtabs.slice(0, 3).map((sub) => (
                                                <span
                                                    key={sub}
                                                    className="rounded-md bg-[#ECEEEB] px-2 py-0.5 text-[11px] text-[#2E312F]"
                                                >
                          {sub}
                        </span>
                                            ))}
                                            <span className="rounded-md bg-[#ECEEEB] px-2 py-0.5 text-[11px] text-[#707974]">
                        +{Math.max(0, pillar.subtabs.length - 3)} more
                      </span>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between border-t border-[#ECEEEB] pt-3 text-[11px] text-[#707974]">
                                            <span className="truncate">{getPillarFooterLine(pillar.slug)}</span>
                                            <span className="font-mono font-medium text-[#004635] shrink-0 ml-2">
                        {score}% score
                      </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div
                            id="weekly-balance"
                            className="mt-7 sm:mt-8 grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12"
                        >
                            <div className="lg:col-span-7 rounded-xl border border-[#BFC9C3]/70 bg-white p-4 sm:p-5">
                                <div className="flex items-center justify-between gap-2 mb-4">
                                    <div>
                                        <h2 className="font-serif text-lg font-semibold text-[#111D18]">
                                            Today&apos;s Routines
                                        </h2>
                                        <p className="text-xs text-[#707974]">
                                            Tap a routine to toggle completion
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setHabitFormOpen(true)}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#004635] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#1B5E4B] transition"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add habit
                                    </button>
                                </div>

                                {habits.length === 0 ? (
                                    <p className="py-8 text-center text-xs text-[#707974]">
                                        No daily habits created yet. Add habits via <code className="font-mono">/api/core/habits/</code> or click <strong className="text-[#14221C]">Add habit</strong> above.
                                    </p>
                                ) : (
                                    <div className="divide-y divide-[#ECEEEB]">
                                        {habits.map((habit) => {
                                            const done = completedHabitIds.has(habit.id);
                                            return (
                                                <button
                                                    key={habit.id}
                                                    type="button"
                                                    onClick={() => void toggleHabit(habit)}
                                                    className="flex w-full items-center justify-between py-3 text-left hover:bg-[#F8FAF7] px-2 rounded-lg transition"
                                                >
                                                    <div className="min-w-0 pr-3">
                                                        <div
                                                            className={`text-sm font-medium ${
                                                                done
                                                                    ? 'line-through text-[#707974]'
                                                                    : 'text-[#14221C]'
                                                            }`}
                                                        >
                                                            {habit.title}
                                                        </div>
                                                        <div className="text-xs text-[#707974] capitalize">
                                                            {habit.pillar_slug}
                                                            {habit.scheduled_time ? ` · ${habit.scheduled_time}` : ''}
                                                        </div>
                                                    </div>
                                                    {done ? (
                                                        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#004635]" />
                                                    ) : (
                                                        <Circle className="h-5 w-5 shrink-0 text-[#BFC9C3]" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="lg:col-span-5 rounded-xl border border-[#BFC9C3]/70 bg-white p-4 sm:p-5 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="font-serif text-lg font-semibold text-[#111D18]">
                                            Weekly Balance
                                        </h2>
                                        <Link
                                            href="/dashboard/weekly-insights"
                                            className="text-xs font-medium text-[#004635] hover:underline"
                                        >
                                            Trends →
                                        </Link>
                                    </div>

                                    <div className="space-y-3.5">
                                        {PILLARS.map((pillar) => {
                                            const score = latestPillarScores[pillar.slug] ?? 0;
                                            return (
                                                <div key={pillar.slug}>
                                                    <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-[#14221C]">
                              {pillar.label}
                            </span>
                                                        <span className="font-mono font-semibold text-[#2E312F]">
                              {score}%
                            </span>
                                                    </div>
                                                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#ECEEEB]">
                                                        <div
                                                            className={`h-full rounded-full ${pillar.barColor}`}
                                                            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mt-5 flex items-start gap-2 rounded-lg bg-[#ECEEEB]/60 p-3 text-xs text-[#2E312F]">
                                    <Sparkles className="h-4 w-4 shrink-0 text-[#004635] mt-0.5" />
                                    <span>
                    Weekly scores update automatically when you log check-ins, habits,
                    and pillar activity.
                  </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-7 sm:mt-8">
                            <HexadRadarChart
                                scores={radarScores}
                                onSelectPillar={handlePillarNavigateOrCheckin}
                                onRecalibrate={() => setQuizOpen(true)}
                            />
                        </div>
                    </>
                )}
            </main>

            <BaselineQuizModal
                open={quizOpen}
                initialScores={baselineScores}
                onClose={() => setQuizOpen(false)}
                onSave={handleSaveBaseline}
            />

            {habitFormOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                New Daily Habit
                            </h3>
                            <button
                                type="button"
                                onClick={() => setHabitFormOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateHabit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Pillar
                                </label>
                                <select
                                    value={habitPillar}
                                    onChange={(e) => setHabitPillar(e.target.value as PillarSlug)}
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
                                    Habit title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={habitTitle}
                                    onChange={(e) => setHabitTitle(e.target.value)}
                                    placeholder="e.g., 30m morning review"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Scheduled time (optional)
                                </label>
                                <input
                                    type="time"
                                    value={habitScheduledTime}
                                    onChange={(e) => setHabitScheduledTime(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setHabitFormOpen(false)}
                                    className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={habitSubmitting}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {habitSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Create habit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {checkinOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Log Pillar Check-in
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCheckinOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCheckinSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Pillar
                                </label>
                                <select
                                    value={checkinPillar}
                                    onChange={(e) => setCheckinPillar(e.target.value as PillarSlug)}
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
                                    Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={checkinTitle}
                                    onChange={(e) => setCheckinTitle(e.target.value)}
                                    placeholder="e.g., Completed 45m study block"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Note (optional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={checkinNote}
                                    onChange={(e) => setCheckinNote(e.target.value)}
                                    placeholder="Key takeaway or reflection..."
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCheckinOpen(false)}
                                    className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={checkinSubmitting}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {checkinSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save check-in
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}