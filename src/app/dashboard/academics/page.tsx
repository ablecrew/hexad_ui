'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { AcademicsShell } from '@/components/academics/AcademicsShell';
import { useAuth } from '@/context/AuthContext';
import {
    AcademicsSummary,
    academicsApi,
    ReadingItem,
} from '@/lib/academics-api';
import { coreApi, PillarCheckin } from '@/lib/dashboard-api';
import { PillarGoal, UserStreak } from '@/types/api';

type CheckinWithLoggedAt = PillarCheckin & {
    logged_at?: string | null;
    created_at?: string | null;
};

type StudySessionsCache = {
    streak: UserStreak | null;
    summary: AcademicsSummary | null;
    goals: PillarGoal[];
    checkins: CheckinWithLoggedAt[];
    readingItems: ReadingItem[];
};

const CACHE_TTL_MS = 10 * 60 * 1000;

function getCacheKey(userId?: string | number | null): string | null {
    if (!userId) return null;
    return `hexad:academics:study-sessions:${userId}`;
}

function readCache(key: string | null): StudySessionsCache | null {
    if (!key || typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { data?: StudySessionsCache; savedAt?: number };
        if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
            return null;
        }
        return parsed.data ?? null;
    } catch {
        return null;
    }
}

function writeCache(key: string | null, data: StudySessionsCache): void {
    if (!key || typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }));
    } catch {
        // Ignore storage quota or private-mode errors
    }
}

function formatDurationHm(totalMins: number): string {
    const safe = Math.max(0, Math.round(totalMins));
    const hrs = Math.floor(safe / 60);
    const mins = safe % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
}

function getCheckinDateLabel(item: CheckinWithLoggedAt): string {
    const raw = item.logged_at ?? item.created_at;
    return raw ? String(raw).slice(0, 10) : '';
}

export default function StudySessionsPage() {
    const { user } = useAuth();
    const userId = user?.id;
    const cacheKey = getCacheKey(userId);
    const initialCache = readCache(cacheKey);

    const [streak, setStreak] = useState<UserStreak | null>(() => initialCache?.streak ?? null);
    const [summary, setSummary] = useState<AcademicsSummary | null>(() => initialCache?.summary ?? null);
    const [goals, setGoals] = useState<PillarGoal[]>(() => initialCache?.goals ?? []);
    const [checkins, setCheckins] = useState<CheckinWithLoggedAt[]>(() => initialCache?.checkins ?? []);
    const [readingItems, setReadingItems] = useState<ReadingItem[]>(() => initialCache?.readingItems ?? []);

    const hasCachedData = Boolean(
        initialCache &&
        (initialCache.summary ||
            initialCache.goals.length > 0 ||
            initialCache.checkins.length > 0 ||
            initialCache.readingItems.length > 0 ||
            initialCache.streak)
    );

    const [loading, setLoading] = useState<boolean>(() => !hasCachedData);
    const [error, setError] = useState<string | null>(null);

    // Study session modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [durationMins, setDurationMins] = useState('45');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Goal / Milestone modal state
    const [goalModalOpen, setGoalModalOpen] = useState(false);
    const [goalTitle, setGoalTitle] = useState('');
    const [goalCadence, setGoalCadence] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('weekly');
    const [goalTargetValue, setGoalTargetValue] = useState('10');
    const [goalCurrentValue, setGoalCurrentValue] = useState('0');
    const [goalUnit, setGoalUnit] = useState('hours');
    const [goalDueDate, setGoalDueDate] = useState('');
    const [goalSubmitting, setGoalSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!userId) return;
        const activeKey = getCacheKey(userId);
        const cached = readCache(activeKey);

        if (cached) {
            setStreak((prev) => prev ?? cached.streak ?? null);
            setSummary((prev) => prev ?? cached.summary ?? null);
            setGoals((prev) => (prev.length > 0 ? prev : cached.goals ?? []));
            setCheckins((prev) => (prev.length > 0 ? prev : cached.checkins ?? []));
            setReadingItems((prev) => (prev.length > 0 ? prev : cached.readingItems ?? []));
        }

        const hasAnyExistingData = Boolean(
            cached &&
            (cached.summary ||
                cached.goals.length > 0 ||
                cached.checkins.length > 0 ||
                cached.readingItems.length > 0 ||
                cached.streak)
        );
        if (!hasAnyExistingData) {
            setLoading(true);
        }
        setError(null);

        try {
            const [streakRes, sumRes, goalsRes, checkinsRes, readRes] = await Promise.all([
                coreApi.getStreaks().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                academicsApi.getSummary().catch(() => null),
                academicsApi.getAcademicGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                coreApi.getCheckins('academics').catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                academicsApi.getReadingItems().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);

            const nextStreak = streakRes.results[0] ?? null;
            const nextGoals = Array.isArray(goalsRes.results) ? goalsRes.results : [];
            const nextCheckins = Array.isArray(checkinsRes.results)
                ? (checkinsRes.results as CheckinWithLoggedAt[])
                : [];
            const nextReadingItems = Array.isArray(readRes.results) ? readRes.results : [];

            setStreak(nextStreak);
            setSummary(sumRes);
            setGoals(nextGoals);
            setCheckins(nextCheckins);
            setReadingItems(nextReadingItems);

            writeCache(activeKey, {
                streak: nextStreak,
                summary: sumRes,
                goals: nextGoals,
                checkins: nextCheckins,
                readingItems: nextReadingItems,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load study sessions.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const completedBooksCount = useMemo(
        () =>
            readingItems.filter(
                (b) => b.status === 'completed' || (b.total_pages > 0 && b.pages_read >= b.total_pages)
            ).length,
        [readingItems]
    );

    const totalPagesRead = useMemo(
        () => readingItems.reduce((acc, b) => acc + (Number(b.pages_read) || 0), 0),
        [readingItems]
    );

    const openModal = () => {
        setTitle('');
        setDurationMins('45');
        setNote('');
        setModalOpen(true);
    };

    const openGoalModal = () => {
        setGoalTitle('');
        setGoalCadence('weekly');
        setGoalTargetValue('10');
        setGoalCurrentValue('0');
        setGoalUnit('hours');
        setGoalDueDate('');
        setGoalModalOpen(true);
    };

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            const mins = Math.max(1, Number(durationMins) || 45);
            await coreApi.createCheckin({
                pillar_slug: 'academics',
                subtab_slug: 'study-sessions',
                title: title.trim(),
                metric_label: formatDurationHm(mins),
                note: note.trim() || undefined,
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to log study session.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!goalTitle.trim()) return;
        setGoalSubmitting(true);
        setError(null);
        try {
            await coreApi.createGoal({
                pillar_slug: 'academics',
                subtab_slug: 'study-sessions',
                title: goalTitle.trim(),
                cadence: goalCadence,
                target_value: Math.max(1, Number(goalTargetValue) || 1),
                current_value: Math.max(0, Number(goalCurrentValue) || 0),
                unit: goalUnit.trim() || 'units',
                due_date: goalDueDate || null,
            });
            setGoalModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save goal or milestone.');
        } finally {
            setGoalSubmitting(false);
        }
    };

    return (
        <AcademicsShell
            subtitle="Study sessions, coursework milestones, reading list, and skill mastery."
            ctaLabel="Log study session"
            onCtaClick={openModal}
            error={error}
        >
            {loading ? (
                <div className="mt-14 flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-[#004635]" />
                </div>
            ) : (
                <>
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Weekly Study Time</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#00629F]">
                                {formatDurationHm(summary?.total_exam_prep_mins ?? 0)}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                {checkins.length} study sessions logged
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Study Streak</div>
                            <div className="mt-2 font-serif text-2xl font-semibold text-[#111D18]">
                                {streak?.current_streak_days ?? 0} days
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Best: {streak?.longest_streak_days ?? 0} days
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Active Milestones</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.filter((g) => g.status === 'active').length} / {goals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Academic goals tracked</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Books Completed</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {completedBooksCount}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                {totalPagesRead} pages read total
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between gap-2 mb-3.5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                    Active Goals &amp; Milestones
                                </h2>
                                <button
                                    type="button"
                                    onClick={openGoalModal}
                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#BFC9C3] bg-white px-3 py-1.5 text-xs font-medium text-[#14221C] hover:bg-[#ECEEEB] transition"
                                >
                                    <Plus className="h-3.5 w-3.5 text-[#004635]" />
                                    Add milestone
                                </button>
                            </div>
                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    <p>No academic goals created yet.</p>
                                    <button
                                        type="button"
                                        onClick={openGoalModal}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add first milestone
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {goals.map((goal) => {
                                        const target = Number(goal.target_value) || 100;
                                        const current = Number(goal.current_value) || 0;
                                        const pct = Math.min(100, Math.max(0, Math.round((current / target) * 100)));
                                        return (
                                            <div
                                                key={goal.id}
                                                className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-[#14221C]">
                                                            {goal.title}
                                                        </div>
                                                        <div className="text-xs text-[#707974] capitalize mt-0.5">
                                                            {goal.cadence} milestone · {goal.status}
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-xs font-semibold text-[#00629F]">
                                                        {pct}%
                                                    </span>
                                                </div>
                                                <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-[#ECEEEB]">
                                                    <div
                                                        className="h-full rounded-full bg-[#00629F]"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <div className="mt-2.5 flex items-center justify-between text-xs text-[#707974]">
                                                    <span className="font-mono">
                                                        {goal.current_value} / {goal.target_value} {goal.unit}
                                                    </span>
                                                    <span className="font-mono">
                                                        {goal.due_date ? `Due ${goal.due_date}` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Recent Sessions
                            </h2>
                            {checkins.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No study sessions logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {checkins.slice(0, 6).map((item) => {
                                        const dateLabel = getCheckinDateLabel(item);
                                        return (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between px-4 py-3.5"
                                            >
                                                <div className="min-w-0 pr-3">
                                                    <div className="truncate text-sm font-semibold text-[#14221C]">
                                                        {item.title}
                                                    </div>
                                                    <div className="font-mono text-[11px] text-[#707974] mt-0.5">
                                                        {dateLabel}
                                                        {item.note ? `${dateLabel ? ' · ' : ''}${item.note}` : ''}
                                                    </div>
                                                </div>
                                                <span className="font-mono text-xs font-semibold text-[#00629F] shrink-0">
                                                    {item.metric_label || 'Logged'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Add Goal / Milestone Modal */}
            {goalModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add milestone
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
                                    Goal / Milestone Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={goalTitle}
                                    onChange={(e) => setGoalTitle(e.target.value)}
                                    placeholder="e.g., Complete 10 hours of algorithms review"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                        Unit
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={goalUnit}
                                        onChange={(e) => setGoalUnit(e.target.value)}
                                        placeholder="e.g., hours, chapters"
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Current Value
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        required
                                        value={goalCurrentValue}
                                        onChange={(e) => setGoalCurrentValue(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Target Value
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        step="any"
                                        required
                                        value={goalTargetValue}
                                        onChange={(e) => setGoalTargetValue(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Due Date (optional)
                                </label>
                                <input
                                    type="date"
                                    value={goalDueDate}
                                    onChange={(e) => setGoalDueDate(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
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
                                    disabled={goalSubmitting}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {goalSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save milestone
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Log Study Session Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Log study session
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSession} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Study Session Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Duration (mins)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    required
                                    value={durationMins}
                                    onChange={(e) => setDurationMins(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Session Note (optional)
                                </label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AcademicsShell>
    );
}