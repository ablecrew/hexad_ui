'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { AcademicsShell } from '@/components/academics/AcademicsShell';
import { useAuth } from '@/context/AuthContext';
import {
    AcademicsSummary,
    academicsApi,
    ReadingItem,
} from '@/lib/academics-api';
import { coreApi, PillarCheckin } from '@/lib/dashboard-api';
import { PillarGoal, UserStreak } from '@/types/api';

function formatDurationHm(totalMins: number): string {
    const safe = Math.max(0, Math.round(totalMins));
    const hrs = Math.floor(safe / 60);
    const mins = safe % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
}

export default function StudySessionsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [streak, setStreak] = useState<UserStreak | null>(null);
    const [summary, setSummary] = useState<AcademicsSummary | null>(null);
    const [goals, setGoals] = useState<PillarGoal[]>([]);
    const [checkins, setCheckins] = useState<PillarCheckin[]>([]);
    const [readingItems, setReadingItems] = useState<ReadingItem[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [durationMins, setDurationMins] = useState('45');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [streakRes, sumRes, goalsRes, checkinsRes, readRes] = await Promise.all([
                coreApi.getStreaks().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                academicsApi.getSummary().catch(() => null),
                academicsApi.getAcademicGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                coreApi.getCheckins('academics').catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                academicsApi.getReadingItems().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);
            setStreak(streakRes.results[0] ?? null);
            setSummary(sumRes);
            setGoals(goalsRes.results);
            setCheckins(checkinsRes.results);
            setReadingItems(readRes.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load study sessions.');
        } finally {
            setLoading(false);
        }
    }, [user]);

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
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Active Goals &amp; Milestones
                            </h2>
                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No academic goals created yet.
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
                                    {checkins.slice(0, 6).map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {item.title}
                                                </div>
                                                <div className="font-mono text-[11px] text-[#707974] mt-0.5">
                                                    {item.created_at?.slice(0, 10)}
                                                    {item.note ? ` · ${item.note}` : ''}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#00629F] shrink-0">
                        {item.metric_label || 'Logged'}
                      </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
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