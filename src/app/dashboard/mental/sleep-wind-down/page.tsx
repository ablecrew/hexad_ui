'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { MentalShell } from '@/components/mental/MentalShell';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api-client';
import {
    coreApi,
    MentalSummary,
    PillarCheckin,
} from '@/lib/dashboard-api';
import { mentalApi } from '@/lib/mental-api';
import { PillarGoal } from '@/types/api';

type GoalWithSubtab = PillarGoal & {
    subtab_slug?: string | null;
};

const RITUAL_PREFIX = '[Ritual] ';
const OTHER_MENTAL_PREFIXES = [
    '[Framework] ',
    '[Guardrail] ',
    '[Habit] ',
    '[Protocol] ',
    '[Mood] ',
    '[Journal] ',
    '[Calm] ',
];
const OTHER_MENTAL_SLUGS = [
    'cognitive-notes',
    'detox',
    'focus-training',
    'stress-reset',
    'mood',
    'journal',
    'calm',
];

function isEveningRitualGoal(goal: GoalWithSubtab): boolean {
    if (goal.subtab_slug === 'sleep-wind-down') return true;
    if (goal.subtab_slug && OTHER_MENTAL_SLUGS.includes(goal.subtab_slug)) return false;

    const lowerTitle = goal.title.toLowerCase();
    if (goal.title.startsWith(RITUAL_PREFIX)) return true;
    if (OTHER_MENTAL_PREFIXES.some((prefix) => goal.title.startsWith(prefix))) return false;

    return (
        lowerTitle.includes('ritual') ||
        lowerTitle.includes('sleep') ||
        lowerTitle.includes('wind-down') ||
        lowerTitle.includes('wind down') ||
        lowerTitle.includes('lights-out') ||
        lowerTitle.includes('evening') ||
        !goal.title.startsWith('[')
    );
}

function cleanGoalTitle(title: string): string {
    return title.startsWith(RITUAL_PREFIX)
        ? title.slice(RITUAL_PREFIX.length)
        : title;
}

function formatShortDate(iso?: string | null): string {
    if (!iso) return 'Recent';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return String(iso).slice(0, 10) || 'Recent';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SleepWindDownPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<MentalSummary | null>(null);
    const [goals, setGoals] = useState<GoalWithSubtab[]>([]);
    const [nights, setNights] = useState<PillarCheckin[]>([]);

    // Log wind-down modal
    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [clarityRating, setClarityRating] = useState('4.5');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Add evening ritual goal modal ("Add ritual")
    const [ritualModalOpen, setRitualModalOpen] = useState(false);
    const [ritualTitle, setRitualTitle] = useState('');
    const [ritualCadence, setRitualCadence] = useState('daily');
    const [ritualTarget, setRitualTarget] = useState('7');
    const [ritualCurrent, setRitualCurrent] = useState('0');
    const [ritualUnit, setRitualUnit] = useState('nights');
    const [creatingRitual, setCreatingRitual] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, goalsRes, checkinsRes] = await Promise.all([
                mentalApi.getSummary().catch(() => null),
                mentalApi.getMentalGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                coreApi.getCheckins('mental').catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);
            setSummary(sumRes);
            const rawGoals = Array.isArray(goalsRes.results) ? goalsRes.results : [];
            setGoals(rawGoals.filter(isEveningRitualGoal));
            setNights(Array.isArray(checkinsRes.results) ? checkinsRes.results : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sleep wind-down.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleLogWindDown = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            await coreApi.createCheckin({
                pillar_slug: 'mental',
                subtab_slug: 'sleep-wind-down',
                title: title.trim(),
                note: note.trim() || undefined,
                metric_label: clarityRating.trim() || '4.5',
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save wind-down.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddRitualGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ritualTitle.trim()) return;
        setCreatingRitual(true);
        setError(null);
        try {
            const targetVal = Math.max(1, Number(ritualTarget) || 1);
            const currentVal = Math.max(0, Number(ritualCurrent) || 0);
            const rawTitle = cleanGoalTitle(ritualTitle.trim());
            const unitLabel = ritualUnit.trim() || 'nights';

            const createdGoal = await apiFetch<GoalWithSubtab>('/core/goals/', {
                method: 'POST',
                body: JSON.stringify({
                    pillar_slug: 'mental',
                    subtab_slug: 'sleep-wind-down',
                    title: `${RITUAL_PREFIX}${rawTitle}`,
                    cadence: ritualCadence,
                    target_value: targetVal,
                    current_value: currentVal,
                    unit: unitLabel,
                }),
            });

            await coreApi
                .createCheckin({
                    pillar_slug: 'mental',
                    subtab_slug: 'sleep-wind-down',
                    title: `New Evening Ritual: ${rawTitle}`,
                    note: `${ritualCadence} target: ${targetVal} ${unitLabel}`,
                    metric_label: 'Ritual added',
                })
                .catch(() => null);

            setGoals((prev) => [
                { ...createdGoal, subtab_slug: createdGoal.subtab_slug ?? 'sleep-wind-down' },
                ...prev,
            ]);
            setRitualModalOpen(false);
            await loadData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Unable to save evening ritual.'
            );
        } finally {
            setCreatingRitual(false);
        }
    };

    return (
        <MentalShell
            subtitle="Evening decompression, lights-out consistency, and restful sleep prep."
            ctaLabel="Log wind-down"
            onCtaClick={() => {
                setTitle('');
                setClarityRating('4.5');
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
                            <div className="text-xs text-[#707974]">Logged Nights</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#006B5A]">
                                {nights.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Evening wind-down entries</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Evening Rituals</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Active wind-down goals</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Detox Minutes</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.total_detox_mins ?? 0}m
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Screen-free minutes</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Cognitive Notes</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.cognitive_notes_count ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Evening reflections</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between gap-3 mb-3.5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                    Evening Rituals
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRitualTitle('');
                                        setRitualCadence('daily');
                                        setRitualTarget('7');
                                        setRitualCurrent('0');
                                        setRitualUnit('nights');
                                        setRitualModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1B5E4B] transition"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add ritual
                                </button>
                            </div>

                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    <p>No evening rituals set yet.</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRitualTitle('');
                                            setRitualCadence('daily');
                                            setRitualTarget('7');
                                            setRitualCurrent('0');
                                            setRitualUnit('nights');
                                            setRitualModalOpen(true);
                                        }}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#004635] px-3 py-1.5 text-xs font-medium text-[#004635] hover:bg-[#F2F6F4]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add ritual
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {goals.map((g, idx) => {
                                        const target = Number(g.target_value) || 1;
                                        const current = Number(g.current_value) || 0;
                                        const pct = Math.min(100, Math.max(0, Math.round((current / target) * 100)));
                                        return (
                                            <div
                                                key={g.id ?? idx}
                                                className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-[#14221C]">
                                                            {cleanGoalTitle(g.title)}
                                                        </div>
                                                        <div className="text-xs text-[#707974] capitalize mt-0.5">
                                                            {g.cadence} evening ritual
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-xs font-semibold text-[#006B5A]">
                                                        {pct}%
                                                    </span>
                                                </div>
                                                <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-[#ECEEEB]">
                                                    <div
                                                        className="h-full rounded-full bg-[#006B5A]"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <div className="mt-2.5 font-mono text-xs text-[#707974]">
                                                    {current} / {target} {g.unit || ''}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Recent Nights
                            </h2>
                            {nights.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No recent wind-down nights logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {nights.slice(0, 6).map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {item.title}
                                                </div>
                                                <div className="text-xs text-[#707974] mt-0.5 truncate">
                                                    {formatShortDate(item.created_at)}
                                                    {item.note ? ` · ${item.note}` : ''}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#006B5A] shrink-0">
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

            {/* Log Wind-Down Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Log wind-down
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleLogWindDown} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Evening Summary
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Last Night · 10:25 PM"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Clarity Score (out of 5)
                                </label>
                                <input
                                    type="text"
                                    value={clarityRating}
                                    onChange={(e) => setClarityRating(e.target.value)}
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

            {/* Add Evening Ritual Goal Modal */}
            {ritualModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add evening ritual
                            </h3>
                            <button
                                type="button"
                                onClick={() => setRitualModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddRitualGoal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Ritual Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={ritualTitle}
                                    onChange={(e) => setRitualTitle(e.target.value)}
                                    placeholder="e.g., Dim Lights & Tea at 9:45 PM"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Cadence
                                    </label>
                                    <select
                                        value={ritualCadence}
                                        onChange={(e) => setRitualCadence(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Unit
                                    </label>
                                    <input
                                        type="text"
                                        value={ritualUnit}
                                        onChange={(e) => setRitualUnit(e.target.value)}
                                        placeholder="e.g., nights, evenings"
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Current Progress
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={ritualCurrent}
                                        onChange={(e) => setRitualCurrent(e.target.value)}
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
                                        value={ritualTarget}
                                        onChange={(e) => setRitualTarget(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setRitualModalOpen(false)}
                                    className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingRitual}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {creatingRitual && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save ritual
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MentalShell>
    );
}