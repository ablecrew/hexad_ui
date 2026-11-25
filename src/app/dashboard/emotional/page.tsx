'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { EmotionalShell } from '@/components/emotional/EmotionalShell';
import { useAuth } from '@/context/AuthContext';
import {
    coreApi,
    EmotionalSummary,
    PillarCheckin,
} from '@/lib/dashboard-api';
import { emotionalApi } from '@/lib/emotional-api';
import { PillarGoal } from '@/types/api';

type CheckinRecord = PillarCheckin & {
    created_at?: string | null;
    logged_at?: string | null;
    date?: string | null;
};

function formatShortDate(item: CheckinRecord): string {
    const raw = item.created_at ?? item.logged_at ?? item.date;
    if (!raw) return 'Recent';
    const str = String(raw);
    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return str.slice(0, 10) || 'Recent';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MoodCheckinPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<EmotionalSummary | null>(null);
    const [goals, setGoals] = useState<PillarGoal[]>([]);
    const [reflections, setReflections] = useState<CheckinRecord[]>([]);

    // Mood check-in modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [moodScore, setMoodScore] = useState('4.5');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Emotional goal modal state
    const [goalModalOpen, setGoalModalOpen] = useState(false);
    const [goalTitle, setGoalTitle] = useState('');
    const [goalCadence, setGoalCadence] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('daily');
    const [goalTargetValue, setGoalTargetValue] = useState('7');
    const [goalCurrentValue, setGoalCurrentValue] = useState('0');
    const [goalUnit, setGoalUnit] = useState('days');
    const [goalDueDate, setGoalDueDate] = useState('');
    const [goalSubmitting, setGoalSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, goalsRes, checkinsRes] = await Promise.all([
                emotionalApi.getSummary().catch(() => null),
                emotionalApi.getEmotionalGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                coreApi.getCheckins('emotional').catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);
            setSummary(sumRes);
            setGoals(goalsRes.results);
            setReflections(Array.isArray(checkinsRes.results) ? checkinsRes.results : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load mood check-ins.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const openGoalModal = () => {
        setGoalTitle('');
        setGoalCadence('daily');
        setGoalTargetValue('7');
        setGoalCurrentValue('0');
        setGoalUnit('days');
        setGoalDueDate('');
        setGoalModalOpen(true);
    };

    const handleLogMoodEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            await coreApi.createCheckin({
                pillar_slug: 'emotional',
                subtab_slug: 'mood-check-in',
                title: title.trim(),
                note: note.trim() || undefined,
                metric_label: moodScore.trim() || '4.5',
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save mood entry.');
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
                pillar_slug: 'emotional',
                subtab_slug: 'mood-check-in',
                title: goalTitle.trim(),
                cadence: goalCadence,
                target_value: Math.max(1, Number(goalTargetValue) || 1),
                current_value: Math.max(0, Number(goalCurrentValue) || 0),
                unit: goalUnit.trim() || 'days',
                due_date: goalDueDate || null,
            });
            setGoalModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save emotional goal.');
        } finally {
            setGoalSubmitting(false);
        }
    };

    return (
        <EmotionalShell
            subtitle="Mood awareness, guided journaling, relationships, and healthy boundaries."
            ctaLabel="Log mood entry"
            onCtaClick={() => {
                setTitle('');
                setMoodScore('4.5');
                setNote('');
                setModalOpen(true);
            }}
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
                            <div className="text-xs text-[#707974]">Journal Entries</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#974722]">
                                {summary?.journal_entries_count ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Recorded reflections</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Active Boundaries</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.active_boundaries_count ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Protected energy rules</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Recent Logs</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {reflections.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Logged emotional entries</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Emotional Goals</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Active habits &amp; targets</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between gap-2 mb-3.5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                    Emotional Goals
                                </h2>
                                <button
                                    type="button"
                                    onClick={openGoalModal}
                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#BFC9C3] bg-white px-3 py-1.5 text-xs font-medium text-[#14221C] hover:bg-[#ECEEEB] transition"
                                >
                                    <Plus className="h-3.5 w-3.5 text-[#004635]" />
                                    Add goal
                                </button>
                            </div>
                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    <p>No emotional goals created yet.</p>
                                    <button
                                        type="button"
                                        onClick={openGoalModal}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add first goal
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {goals.map((g) => {
                                        const target = Number(g.target_value) || 1;
                                        const current = Number(g.current_value) || 0;
                                        const pct = Math.min(100, Math.max(0, Math.round((current / target) * 100)));
                                        return (
                                            <div
                                                key={g.id}
                                                className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-[#14221C]">
                                                            {g.title}
                                                        </div>
                                                        <div className="text-xs text-[#707974] capitalize mt-0.5">
                                                            {g.cadence} cadence
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-xs font-semibold text-[#974722]">
                                                        {pct}%
                                                    </span>
                                                </div>
                                                <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-[#ECEEEB]">
                                                    <div
                                                        className="h-full rounded-full bg-[#974722]"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <div className="mt-2.5 flex items-center justify-between font-mono text-xs text-[#707974]">
                                                    <span>
                                                        {current} / {target} {g.unit || ''}
                                                    </span>
                                                    <span>{g.status}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Recent Reflections
                            </h2>
                            {reflections.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No reflections logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {reflections.slice(0, 6).map((item, idx) => (
                                        <div
                                            key={item.id ?? idx}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {item.title}
                                                </div>
                                                <div className="text-xs text-[#707974] mt-0.5 truncate">
                                                    {formatShortDate(item)}
                                                    {item.note ? ` · ${item.note}` : ''}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#974722] shrink-0">
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

            {/* Add Emotional Goal Modal */}
            {goalModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add emotional goal
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
                                    Goal Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={goalTitle}
                                    onChange={(e) => setGoalTitle(e.target.value)}
                                    placeholder="e.g., Daily evening mood check-in"
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
                                        placeholder="e.g., days, check-ins"
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
                                    Save goal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Log Mood Entry Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Log mood entry
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleLogMoodEntry} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Mood or Check-in Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Morning Mood: Calm"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Mood Rating (out of 5)
                                </label>
                                <input
                                    type="text"
                                    value={moodScore}
                                    onChange={(e) => setMoodScore(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Note (optional)
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
        </EmotionalShell>
    );
}