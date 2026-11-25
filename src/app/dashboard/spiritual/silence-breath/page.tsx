'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Pause, Play, Plus, X } from 'lucide-react';
import { SpiritualShell } from '@/components/spiritual/SpiritualShell';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api-client';
import { coreApi, SpiritualSummary } from '@/lib/dashboard-api';
import {
    BreathSessionItem,
    spiritualApi,
} from '@/lib/spiritual-api';
import { PillarGoal } from '@/types/api';

type GoalWithSubtab = PillarGoal & {
    subtab_slug?: string | null;
};

const STILLNESS_PREFIX = '[Stillness] ';

function isExcludedMeditationGoal(goal: GoalWithSubtab): boolean {
    if (goal.subtab_slug === 'meditation') return true;
    const titleLower = goal.title.toLowerCase();
    return (
        goal.title.startsWith('[Meditation] ') ||
        titleLower.includes('meditat') ||
        titleLower.includes('dawn')
    );
}

function isStillnessGoal(goal: GoalWithSubtab): boolean {
    if (isExcludedMeditationGoal(goal)) return false;
    if (goal.subtab_slug) {
        return goal.subtab_slug === 'silence-breath';
    }
    return goal.title.startsWith(STILLNESS_PREFIX) || !goal.title.startsWith('[');
}

function cleanGoalTitle(title: string): string {
    return title.startsWith(STILLNESS_PREFIX)
        ? title.slice(STILLNESS_PREFIX.length)
        : title;
}

function formatSessionDate(item: BreathSessionItem): string {
    const raw = item.created_at;
    if (!raw) return 'Recent';
    return String(raw).slice(0, 10) || 'Recent';
}

export default function SilenceBreathPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<SpiritualSummary | null>(null);
    const [goals, setGoals] = useState<GoalWithSubtab[]>([]);
    const [sessions, setSessions] = useState<BreathSessionItem[]>([]);

    const [timerRunning, setTimerRunning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(10 * 60);

    // Add stillness cadence goal modal ("Add cadence")
    const [cadenceModalOpen, setCadenceModalOpen] = useState(false);
    const [cadenceTitle, setCadenceTitle] = useState('');
    const [cadenceFrequency, setCadenceFrequency] = useState('daily');
    const [cadenceTarget, setCadenceTarget] = useState('20');
    const [cadenceCurrent, setCadenceCurrent] = useState('0');
    const [cadenceUnit, setCadenceUnit] = useState('sits');
    const [creatingCadence, setCreatingCadence] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, goalsRes, sessRes] = await Promise.all([
                spiritualApi.getSummary().catch(() => null),
                spiritualApi.getSpiritualGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                spiritualApi.getBreathSessions().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);
            setSummary(sumRes);
            const rawGoals = Array.isArray(goalsRes.results) ? goalsRes.results : [];
            setGoals(rawGoals.filter(isStillnessGoal));
            setSessions(Array.isArray(sessRes.results) ? sessRes.results : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load breath & stillness.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useEffect(() => {
        if (!timerRunning) return;
        const interval = setInterval(() => {
            setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [timerRunning]);

    const handleAddCadenceGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cadenceTitle.trim()) return;
        setCreatingCadence(true);
        setError(null);
        try {
            const targetVal = Math.max(1, Number(cadenceTarget) || 1);
            const currentVal = Math.max(0, Number(cadenceCurrent) || 0);
            const rawTitle = cleanGoalTitle(cadenceTitle.trim());
            const unitLabel = cadenceUnit.trim() || 'sits';

            const createdGoal = await apiFetch<GoalWithSubtab>('/core/goals/', {
                method: 'POST',
                body: JSON.stringify({
                    pillar_slug: 'spiritual',
                    subtab_slug: 'silence-breath',
                    title: `${STILLNESS_PREFIX}${rawTitle}`,
                    cadence: cadenceFrequency,
                    target_value: targetVal,
                    current_value: currentVal,
                    unit: unitLabel,
                }),
            });

            await coreApi
                .createCheckin({
                    pillar_slug: 'spiritual',
                    subtab_slug: 'silence-breath',
                    title: `New Stillness Cadence: ${rawTitle}`,
                    note: `${cadenceFrequency} target: ${targetVal} ${unitLabel}`,
                    metric_label: 'Cadence added',
                })
                .catch(() => null);

            setGoals((prev) => [
                { ...createdGoal, subtab_slug: createdGoal.subtab_slug ?? 'silence-breath' },
                ...prev,
            ]);
            setCadenceModalOpen(false);
            await loadData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Unable to save stillness cadence.'
            );
        } finally {
            setCreatingCadence(false);
        }
    };

    const minsDisplay = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const secsDisplay = String(secondsLeft % 60).padStart(2, '0');

    return (
        <SpiritualShell
            subtitle="Breathwork cadences, unguided quiet sits, and nervous-system stillness."
            ctaLabel={timerRunning ? `${minsDisplay}:${secsDisplay} · Pause` : 'Start breath timer'}
            ctaIcon={
                timerRunning ? (
                    <Pause className="h-3.5 w-3.5" />
                ) : (
                    <Play className="h-3.5 w-3.5" />
                )
            }
            onCtaClick={() => setTimerRunning((r) => !r)}
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
                            <div className="text-xs text-[#707974]">Silence Time</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#554AB2]">
                                {summary?.total_breath_mins ?? 0}m
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Total breath &amp; quiet sits</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Breath Sessions</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {sessions.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Logged stillness sessions</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Breath Timer</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {minsDisplay}:{secsDisplay}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                {timerRunning ? 'Timer running' : 'Ready to begin'}
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Active Cadences</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Stillness routines</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between gap-3 mb-3.5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                    Breath &amp; Stillness Cadences
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCadenceTitle('');
                                        setCadenceFrequency('daily');
                                        setCadenceTarget('20');
                                        setCadenceCurrent('0');
                                        setCadenceUnit('sits');
                                        setCadenceModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1B5E4B] transition"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add cadence
                                </button>
                            </div>

                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    <p>No stillness cadences created yet.</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCadenceTitle('');
                                            setCadenceFrequency('daily');
                                            setCadenceTarget('20');
                                            setCadenceCurrent('0');
                                            setCadenceUnit('sits');
                                            setCadenceModalOpen(true);
                                        }}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#004635] px-3 py-1.5 text-xs font-medium text-[#004635] hover:bg-[#F2F6F4]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add cadence
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
                                                            {g.cadence} stillness cadence
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
                                Recent Sits
                            </h2>
                            {sessions.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No breathwork or stillness sessions logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {sessions.slice(0, 6).map((s, idx) => (
                                        <div
                                            key={s.id ?? idx}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {s.title || s.cadence || 'Breath session'}
                                                </div>
                                                <div className="text-xs text-[#707974] mt-0.5 truncate">
                                                    {formatSessionDate(s)}
                                                    {s.cadence ? ` · ${s.cadence}` : ''}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#554AB2] shrink-0">
                                                {s.duration_mins ? `${s.duration_mins}m` : 'Logged'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Add Stillness Cadence Goal Modal */}
            {cadenceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add stillness cadence
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCadenceModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddCadenceGoal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Cadence Goal Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={cadenceTitle}
                                    onChange={(e) => setCadenceTitle(e.target.value)}
                                    placeholder="e.g., Box Breathing (4-4-4-4)"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Cadence
                                    </label>
                                    <select
                                        value={cadenceFrequency}
                                        onChange={(e) => setCadenceFrequency(e.target.value)}
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
                                        value={cadenceUnit}
                                        onChange={(e) => setCadenceUnit(e.target.value)}
                                        placeholder="e.g., sits, mins"
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
                                        value={cadenceCurrent}
                                        onChange={(e) => setCadenceCurrent(e.target.value)}
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
                                        value={cadenceTarget}
                                        onChange={(e) => setCadenceTarget(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCadenceModalOpen(false)}
                                    className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingCadence}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {creatingCadence && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save cadence
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </SpiritualShell>
    );
}