'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { SpiritualShell } from '@/components/spiritual/SpiritualShell';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api-client';
import {
    coreApi,
    PillarCheckin,
    SpiritualSummary,
} from '@/lib/dashboard-api';
import { spiritualApi } from '@/lib/spiritual-api';
import { PillarGoal } from '@/types/api';

type CheckinWithOptionalDates = PillarCheckin & {
    created_at?: string | null;
    logged_at?: string | null;
    date?: string | null;
};

type GoalWithSubtab = PillarGoal & {
    subtab_slug?: string | null;
};

const VALUES_PREFIX = '[Values] ';

function isExcludedMeditationGoal(goal: GoalWithSubtab): boolean {
    if (goal.subtab_slug === 'meditation') return true;
    const titleLower = goal.title.toLowerCase();
    return (
        goal.title.startsWith('[Meditation] ') ||
        titleLower.includes('meditat') ||
        titleLower.includes('dawn')
    );
}

function isValuesGoal(goal: GoalWithSubtab): boolean {
    if (isExcludedMeditationGoal(goal)) return false;
    if (goal.subtab_slug) {
        return goal.subtab_slug === 'values-purpose';
    }
    return goal.title.startsWith(VALUES_PREFIX) || !goal.title.startsWith('[');
}

function cleanGoalTitle(title: string): string {
    return title.startsWith(VALUES_PREFIX)
        ? title.slice(VALUES_PREFIX.length)
        : title;
}

function formatCheckinDate(item: CheckinWithOptionalDates): string {
    const raw = item.created_at ?? item.logged_at ?? item.date;
    if (!raw) return 'Recent';
    const str = String(raw);
    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) {
        return str.slice(0, 10) || 'Recent';
    }
    return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

export default function ValuesPurposePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<SpiritualSummary | null>(null);
    const [goals, setGoals] = useState<GoalWithSubtab[]>([]);
    const [checkins, setCheckins] = useState<CheckinWithOptionalDates[]>([]);

    // Value reflection check-in modal
    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [metricLabel, setMetricLabel] = useState('Core Value');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Values & purpose commitment goal modal ("Add commitment")
    const [goalModalOpen, setGoalModalOpen] = useState(false);
    const [goalTitle, setGoalTitle] = useState('');
    const [goalCadence, setGoalCadence] = useState('weekly');
    const [goalTarget, setGoalTarget] = useState('7');
    const [goalCurrent, setGoalCurrent] = useState('0');
    const [goalUnit, setGoalUnit] = useState('days aligned');
    const [creatingGoal, setCreatingGoal] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, goalsRes, checkinsRes] = await Promise.all([
                spiritualApi.getSummary().catch(() => null),
                spiritualApi.getSpiritualGoals().catch(() => ({
                    count: 0,
                    next: null,
                    previous: null,
                    results: [],
                })),
                coreApi.getCheckins('spiritual').catch(() => ({
                    count: 0,
                    next: null,
                    previous: null,
                    results: [],
                })),
            ]);
            setSummary(sumRes);
            const rawGoals = Array.isArray(goalsRes.results) ? goalsRes.results : [];
            setGoals(rawGoals.filter(isValuesGoal));
            setCheckins(Array.isArray(checkinsRes.results) ? checkinsRes.results : []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to load values & purpose data.'
            );
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleAddValue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            await coreApi.createCheckin({
                pillar_slug: 'spiritual',
                subtab_slug: 'values-purpose',
                title: title.trim(),
                note: note.trim() || undefined,
                metric_label: metricLabel.trim() || 'Core Value',
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Unable to save value reflection.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddCommitmentGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!goalTitle.trim()) return;
        setCreatingGoal(true);
        setError(null);
        try {
            const targetVal = Math.max(1, Number(goalTarget) || 1);
            const currentVal = Math.max(0, Number(goalCurrent) || 0);
            const rawTitle = cleanGoalTitle(goalTitle.trim());
            const unitLabel = goalUnit.trim() || 'days aligned';

            const createdGoal = await apiFetch<GoalWithSubtab>('/core/goals/', {
                method: 'POST',
                body: JSON.stringify({
                    pillar_slug: 'spiritual',
                    subtab_slug: 'values-purpose',
                    title: `${VALUES_PREFIX}${rawTitle}`,
                    cadence: goalCadence,
                    target_value: targetVal,
                    current_value: currentVal,
                    unit: unitLabel,
                }),
            });

            await coreApi
                .createCheckin({
                    pillar_slug: 'spiritual',
                    subtab_slug: 'values-purpose',
                    title: `New Alignment Commitment: ${rawTitle}`,
                    note: `${goalCadence} goal: ${targetVal} ${unitLabel}`,
                    metric_label: 'Commitment added',
                })
                .catch(() => null);

            setGoals((prev) => [
                { ...createdGoal, subtab_slug: createdGoal.subtab_slug ?? 'values-purpose' },
                ...prev,
            ]);
            setGoalModalOpen(false);
            await loadData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Unable to save alignment commitment.'
            );
        } finally {
            setCreatingGoal(false);
        }
    };

    return (
        <SpiritualShell
            subtitle="Clarify guiding principles, purpose statements, and values alignment."
            ctaLabel="Add value"
            onCtaClick={() => {
                setTitle('');
                setMetricLabel('Core Value');
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
                            <div className="text-xs text-[#707974]">Core Values</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#554AB2]">
                                {summary?.values_count ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Defined guiding principles
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Reflections</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {checkins.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Purpose &amp; alignment logs
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Alignment Goals</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Active spiritual targets
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Mindfulness Time</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.total_breath_mins ?? 0}m
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Contemplative stillness
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between gap-3 mb-3.5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                    Values &amp; Purpose Commitments
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setGoalTitle('');
                                        setGoalCadence('weekly');
                                        setGoalTarget('7');
                                        setGoalCurrent('0');
                                        setGoalUnit('days aligned');
                                        setGoalModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1B5E4B] transition"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add commitment
                                </button>
                            </div>

                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    <p>No values or purpose commitments created yet.</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGoalTitle('');
                                            setGoalCadence('weekly');
                                            setGoalTarget('7');
                                            setGoalCurrent('0');
                                            setGoalUnit('days aligned');
                                            setGoalModalOpen(true);
                                        }}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#004635] px-3 py-1.5 text-xs font-medium text-[#004635] hover:bg-[#F2F6F4]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add commitment
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {goals.map((g, idx) => {
                                        const target = Number(g.target_value) || 1;
                                        const current = Number(g.current_value) || 0;
                                        const pct = Math.min(
                                            100,
                                            Math.max(0, Math.round((current / target) * 100))
                                        );
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
                                                            {g.cadence} alignment goal
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-xs font-semibold text-[#554AB2]">
                                                        {pct}%
                                                    </span>
                                                </div>
                                                <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-[#ECEEEB]">
                                                    <div
                                                        className="h-full rounded-full bg-[#554AB2]"
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
                                Recent Value Reflections
                            </h2>
                            {checkins.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No value reflections logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {checkins.slice(0, 6).map((c, idx) => (
                                        <div
                                            key={c.id ?? idx}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {c.title}
                                                </div>
                                                <div className="text-xs text-[#707974] mt-0.5 truncate">
                                                    {formatCheckinDate(c)}
                                                    {c.note ? ` · ${c.note}` : ''}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#554AB2] shrink-0">
                                                {c.metric_label || 'Value'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Add Value Reflection Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add value
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddValue} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Value or Principle
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Intentional Stewardship"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Tag / Metric Label
                                </label>
                                <input
                                    type="text"
                                    value={metricLabel}
                                    onChange={(e) => setMetricLabel(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Reflection Note (optional)
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
                                    {submitting && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    )}
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Values & Purpose Commitment Goal Modal */}
            {goalModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add commitment
                            </h3>
                            <button
                                type="button"
                                onClick={() => setGoalModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddCommitmentGoal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Commitment Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={goalTitle}
                                    onChange={(e) => setGoalTitle(e.target.value)}
                                    placeholder="e.g., Act with Integrity Under Pressure"
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
                                        onChange={(e) => setGoalCadence(e.target.value)}
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
                                        value={goalUnit}
                                        onChange={(e) => setGoalUnit(e.target.value)}
                                        placeholder="e.g., days aligned, reviews"
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
                                        value={goalCurrent}
                                        onChange={(e) => setGoalCurrent(e.target.value)}
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
                                        value={goalTarget}
                                        onChange={(e) => setGoalTarget(e.target.value)}
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
                                    disabled={creatingGoal}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {creatingGoal && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    )}
                                    Save commitment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </SpiritualShell>
    );
}