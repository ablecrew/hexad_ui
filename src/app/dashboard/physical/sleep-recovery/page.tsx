'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Moon, Plus, X } from 'lucide-react';
import { PhysicalShell } from '@/components/physical/PhysicalShell';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api-client';
import { coreApi, PhysicalSummary } from '@/lib/dashboard-api';
import { physicalApi, PhysicalLogItem } from '@/lib/physical-api';
import { PillarGoal } from '@/types/api';

type GoalWithSubtab = PillarGoal & {
    subtab_slug?: string | null;
};

const RECOVERY_PREFIX = '[Recovery] ';
const OTHER_PHYSICAL_PREFIXES = [
    '[Milestone] ',
    '[Endurance] ',
    '[Vitality] ',
    '[Fueling] ',
];
const OTHER_PHYSICAL_SLUGS = [
    'workouts-mobility',
    'cardio-steps',
    'energy-metrics',
    'nutrition-hydration',
];

function isRecoveryTargetGoal(goal: GoalWithSubtab): boolean {
    if (goal.subtab_slug === 'sleep-recovery') return true;
    if (goal.subtab_slug && OTHER_PHYSICAL_SLUGS.includes(goal.subtab_slug)) return false;

    const lowerTitle = goal.title.toLowerCase();
    if (goal.title.startsWith(RECOVERY_PREFIX)) return true;
    if (OTHER_PHYSICAL_PREFIXES.some((prefix) => goal.title.startsWith(prefix))) return false;

    return (
        lowerTitle.includes('sleep') ||
        lowerTitle.includes('recovery') ||
        lowerTitle.includes('bedtime') ||
        lowerTitle.includes('rest') ||
        !goal.title.startsWith('[')
    );
}

function cleanGoalTitle(title: string): string {
    return title.startsWith(RECOVERY_PREFIX)
        ? title.slice(RECOVERY_PREFIX.length)
        : title;
}

function formatShortDate(item: PhysicalLogItem): string {
    const raw = item.created_at ?? item.logged_at ?? item.date;
    if (!raw) return 'Recent';
    const str = String(raw);
    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return str.slice(0, 10) || 'Recent';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SleepRecoveryPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<PhysicalSummary | null>(null);
    const [goals, setGoals] = useState<GoalWithSubtab[]>([]);
    const [sleepLogs, setSleepLogs] = useState<PhysicalLogItem[]>([]);

    // Log sleep modal
    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [durationLabel, setDurationLabel] = useState('7h 50m');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Add recovery target goal modal ("Add target")
    const [targetModalOpen, setTargetModalOpen] = useState(false);
    const [targetTitle, setTargetTitle] = useState('');
    const [targetCadence, setTargetCadence] = useState('daily');
    const [targetValue, setTargetValue] = useState('8');
    const [targetCurrent, setTargetCurrent] = useState('0');
    const [targetUnit, setTargetUnit] = useState('hrs sleep');
    const [creatingTarget, setCreatingTarget] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, goalsRes, logsRes] = await Promise.all([
                physicalApi.getSummary().catch(() => null),
                physicalApi.getPhysicalGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                physicalApi.getSleepLogs(),
            ]);
            setSummary(sumRes);
            const rawGoals = Array.isArray(goalsRes.results) ? goalsRes.results : [];
            setGoals(rawGoals.filter(isRecoveryTargetGoal));
            setSleepLogs(Array.isArray(logsRes.results) ? logsRes.results : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sleep recovery.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleLogSleep = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            await physicalApi.createSleepLog({
                title: title.trim(),
                metric_label: durationLabel.trim() || undefined,
                note: note.trim() || undefined,
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to log sleep.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddRecoveryTargetGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetTitle.trim()) return;
        setCreatingTarget(true);
        setError(null);
        try {
            const goalTargetVal = Math.max(1, Number(targetValue) || 1);
            const goalCurrentVal = Math.max(0, Number(targetCurrent) || 0);
            const rawTitle = cleanGoalTitle(targetTitle.trim());
            const unitLabel = targetUnit.trim() || 'hrs sleep';

            const createdGoal = await apiFetch<GoalWithSubtab>('/core/goals/', {
                method: 'POST',
                body: JSON.stringify({
                    pillar_slug: 'physical',
                    subtab_slug: 'sleep-recovery',
                    title: `${RECOVERY_PREFIX}${rawTitle}`,
                    cadence: targetCadence,
                    target_value: goalTargetVal,
                    current_value: goalCurrentVal,
                    unit: unitLabel,
                }),
            });

            await coreApi
                .createCheckin({
                    pillar_slug: 'physical',
                    subtab_slug: 'sleep-recovery',
                    title: `New Recovery Target: ${rawTitle}`,
                    note: `${targetCadence} target: ${goalTargetVal} ${unitLabel}`,
                    metric_label: 'Target added',
                })
                .catch(() => null);

            setGoals((prev) => [
                { ...createdGoal, subtab_slug: createdGoal.subtab_slug ?? 'sleep-recovery' },
                ...prev,
            ]);
            setTargetModalOpen(false);
            await loadData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Unable to save recovery target.'
            );
        } finally {
            setCreatingTarget(false);
        }
    };

    return (
        <PhysicalShell
            subtitle="Sleep duration, restorative stages, bedtime consistency, and recovery quality."
            ctaLabel="Log sleep"
            ctaIcon={<Moon className="h-3.5 w-3.5" />}
            onCtaClick={() => {
                setTitle('');
                setDurationLabel('7h 50m');
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
                            <div className="text-xs text-[#707974]">Avg Sleep</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#8F4A00]">
                                {summary?.average_sleep_hrs ?? 0}h
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Recorded sleep average</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Sleep Logs</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {sleepLogs.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Logged nights</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Recovery Targets</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Active sleep goals</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Daily Steps</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {(summary?.total_steps ?? 0).toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Movement baseline</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between gap-3 mb-3.5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                    Recovery Targets
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTargetTitle('');
                                        setTargetCadence('daily');
                                        setTargetValue('8');
                                        setTargetCurrent('0');
                                        setTargetUnit('hrs sleep');
                                        setTargetModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1B5E4B] transition"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add target
                                </button>
                            </div>

                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    <p>No recovery targets set yet.</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTargetTitle('');
                                            setTargetCadence('daily');
                                            setTargetValue('8');
                                            setTargetCurrent('0');
                                            setTargetUnit('hrs sleep');
                                            setTargetModalOpen(true);
                                        }}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#004635] px-3 py-1.5 text-xs font-medium text-[#004635] hover:bg-[#F2F6F4]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add target
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
                                                            {g.cadence} recovery target
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
                                Recent Sleep Logs
                            </h2>
                            {sleepLogs.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No sleep logs recorded yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {sleepLogs.slice(0, 6).map((log, idx) => (
                                        <div
                                            key={log.id ?? idx}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {log.title}
                                                </div>
                                                <div className="text-xs text-[#707974] mt-0.5 truncate">
                                                    {formatShortDate(log)}
                                                    {log.note ? ` · ${log.note}` : ''}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#8F4A00] shrink-0">
                                                {log.metric_label || 'Logged'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Log Sleep Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Log sleep
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleLogSleep} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Sleep Window
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Last Night · 10:25 PM - 6:20 AM"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Duration Label
                                </label>
                                <input
                                    type="text"
                                    value={durationLabel}
                                    onChange={(e) => setDurationLabel(e.target.value)}
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

            {/* Add Recovery Target Goal Modal */}
            {targetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add recovery target
                            </h3>
                            <button
                                type="button"
                                onClick={() => setTargetModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddRecoveryTargetGoal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Target Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={targetTitle}
                                    onChange={(e) => setTargetTitle(e.target.value)}
                                    placeholder="e.g., 8 Hours Restorative Sleep"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Cadence
                                    </label>
                                    <select
                                        value={targetCadence}
                                        onChange={(e) => setTargetCadence(e.target.value)}
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
                                        value={targetUnit}
                                        onChange={(e) => setTargetUnit(e.target.value)}
                                        placeholder="e.g., hrs sleep, nights"
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
                                        value={targetCurrent}
                                        onChange={(e) => setTargetCurrent(e.target.value)}
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
                                        value={targetValue}
                                        onChange={(e) => setTargetValue(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setTargetModalOpen(false)}
                                    className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingTarget}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {creatingTarget && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save target
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PhysicalShell>
    );
}