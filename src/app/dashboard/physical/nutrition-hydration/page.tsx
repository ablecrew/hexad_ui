'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Droplets, Loader2, Plus, X } from 'lucide-react';
import { PhysicalShell } from '@/components/physical/PhysicalShell';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api-client';
import {
    coreApi,
    PhysicalSummary,
    PillarCheckin,
} from '@/lib/dashboard-api';
import { physicalApi } from '@/lib/physical-api';
import { PillarGoal } from '@/types/api';

type CheckinRecord = PillarCheckin & {
    created_at?: string | null;
    logged_at?: string | null;
    date?: string | null;
};

type GoalWithSubtab = PillarGoal & {
    subtab_slug?: string | null;
};

const FUELING_PREFIX = '[Fueling] ';
const OTHER_PHYSICAL_PREFIXES = ['[Milestone] ', '[Endurance] ', '[Vitality] ', '[Sleep] ', '[Recovery] '];
const OTHER_PHYSICAL_SLUGS = ['workouts-mobility', 'cardio-steps', 'energy-metrics', 'sleep', 'recovery'];

function isFuelingGoal(goal: GoalWithSubtab): boolean {
    if (goal.subtab_slug === 'nutrition-hydration') return true;
    if (goal.subtab_slug && OTHER_PHYSICAL_SLUGS.includes(goal.subtab_slug)) return false;

    const lowerTitle = goal.title.toLowerCase();
    if (goal.title.startsWith(FUELING_PREFIX)) return true;
    if (OTHER_PHYSICAL_PREFIXES.some((prefix) => goal.title.startsWith(prefix))) return false;

    return (
        lowerTitle.includes('water') ||
        lowerTitle.includes('hydrat') ||
        lowerTitle.includes('protein') ||
        lowerTitle.includes('nutrition') ||
        lowerTitle.includes('meal') ||
        lowerTitle.includes('fuel') ||
        lowerTitle.includes('calorie') ||
        !goal.title.startsWith('[')
    );
}

function cleanGoalTitle(title: string): string {
    return title.startsWith(FUELING_PREFIX)
        ? title.slice(FUELING_PREFIX.length)
        : title;
}

function formatShortDate(item: CheckinRecord): string {
    const raw = item.created_at ?? item.logged_at ?? item.date;
    if (!raw) return 'Recent';
    const str = String(raw);
    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return str.slice(0, 10) || 'Recent';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NutritionHydrationPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<PhysicalSummary | null>(null);
    const [goals, setGoals] = useState<GoalWithSubtab[]>([]);
    const [intakeLogs, setIntakeLogs] = useState<CheckinRecord[]>([]);

    // Log water & meal modal
    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [amountLabel, setAmountLabel] = useState('500mL');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Add daily fueling goal modal ("Add goal")
    const [goalModalOpen, setGoalModalOpen] = useState(false);
    const [goalTitle, setGoalTitle] = useState('');
    const [goalCadence, setGoalCadence] = useState('daily');
    const [goalTarget, setGoalTarget] = useState('2500');
    const [goalCurrent, setGoalCurrent] = useState('0');
    const [goalUnit, setGoalUnit] = useState('mL water');
    const [creatingGoal, setCreatingGoal] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, goalsRes, checkinsRes] = await Promise.all([
                physicalApi.getSummary().catch(() => null),
                physicalApi.getPhysicalGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                coreApi.getCheckins('physical').catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);
            setSummary(sumRes);
            const rawGoals = Array.isArray(goalsRes.results) ? goalsRes.results : [];
            setGoals(rawGoals.filter(isFuelingGoal));
            setIntakeLogs(Array.isArray(checkinsRes.results) ? checkinsRes.results : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load nutrition & hydration.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleLogWaterAndMeal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            await coreApi.createCheckin({
                pillar_slug: 'physical',
                subtab_slug: 'nutrition-hydration',
                title: title.trim(),
                note: note.trim() || undefined,
                metric_label: amountLabel.trim() || 'Logged',
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to log intake.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddFuelingGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!goalTitle.trim()) return;
        setCreatingGoal(true);
        setError(null);
        try {
            const targetVal = Math.max(1, Number(goalTarget) || 1);
            const currentVal = Math.max(0, Number(goalCurrent) || 0);
            const rawTitle = cleanGoalTitle(goalTitle.trim());
            const unitLabel = goalUnit.trim() || 'mL water';

            const createdGoal = await apiFetch<GoalWithSubtab>('/core/goals/', {
                method: 'POST',
                body: JSON.stringify({
                    pillar_slug: 'physical',
                    subtab_slug: 'nutrition-hydration',
                    title: `${FUELING_PREFIX}${rawTitle}`,
                    cadence: goalCadence,
                    target_value: targetVal,
                    current_value: currentVal,
                    unit: unitLabel,
                }),
            });

            await coreApi
                .createCheckin({
                    pillar_slug: 'physical',
                    subtab_slug: 'nutrition-hydration',
                    title: `New Fueling Goal: ${rawTitle}`,
                    note: `${goalCadence} target: ${targetVal} ${unitLabel}`,
                    metric_label: 'Goal added',
                })
                .catch(() => null);

            setGoals((prev) => [
                { ...createdGoal, subtab_slug: createdGoal.subtab_slug ?? 'nutrition-hydration' },
                ...prev,
            ]);
            setGoalModalOpen(false);
            await loadData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Unable to save fueling goal.'
            );
        } finally {
            setCreatingGoal(false);
        }
    };

    return (
        <PhysicalShell
            subtitle="Daily hydration, balanced whole-food meals, and protein targets."
            ctaLabel="Log water & meal"
            ctaIcon={<Droplets className="h-3.5 w-3.5" />}
            onCtaClick={() => {
                setTitle('');
                setAmountLabel('500mL');
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
                            <div className="text-xs text-[#707974]">Intake Logs</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#8F4A00]">
                                {intakeLogs.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Logged meals &amp; fluids</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Fueling Goals</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Active nutrition targets</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Avg Sleep</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.average_sleep_hrs ?? 0}h
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Recovery support</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Total Steps</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {(summary?.total_steps ?? 0).toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Energy expenditure</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between gap-3 mb-3.5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                    Daily Fueling Goals
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setGoalTitle('');
                                        setGoalCadence('daily');
                                        setGoalTarget('2500');
                                        setGoalCurrent('0');
                                        setGoalUnit('mL water');
                                        setGoalModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1B5E4B] transition"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add goal
                                </button>
                            </div>

                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    <p>No fueling goals set yet.</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGoalTitle('');
                                            setGoalCadence('daily');
                                            setGoalTarget('2500');
                                            setGoalCurrent('0');
                                            setGoalUnit('mL water');
                                            setGoalModalOpen(true);
                                        }}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#004635] px-3 py-1.5 text-xs font-medium text-[#004635] hover:bg-[#F2F6F4]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add goal
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
                                                            {g.cadence} fueling target
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-xs font-semibold text-[#8F4A00]">
                                                        {pct}%
                                                    </span>
                                                </div>
                                                <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-[#ECEEEB]">
                                                    <div
                                                        className="h-full rounded-full bg-[#8F4A00]"
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
                                Today&apos;s Intake
                            </h2>
                            {intakeLogs.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No meals or hydration logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {intakeLogs.slice(0, 6).map((item, idx) => (
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
                                            <span className="font-mono text-xs font-semibold text-[#8F4A00] shrink-0">
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

            {/* Log Water & Meal Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Log water &amp; meal
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleLogWaterAndMeal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Meal or Hydration Item
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Greek Yogurt & Berries"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Amount / Protein Label
                                </label>
                                <input
                                    type="text"
                                    value={amountLabel}
                                    onChange={(e) => setAmountLabel(e.target.value)}
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

            {/* Add Daily Fueling Goal Modal */}
            {goalModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add fueling goal
                            </h3>
                            <button
                                type="button"
                                onClick={() => setGoalModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddFuelingGoal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Fueling Goal Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={goalTitle}
                                    onChange={(e) => setGoalTitle(e.target.value)}
                                    placeholder="e.g., Daily Hydration Target"
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
                                        placeholder="e.g., mL water, g protein, meals"
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
                                    {creatingGoal && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save goal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PhysicalShell>
    );
}