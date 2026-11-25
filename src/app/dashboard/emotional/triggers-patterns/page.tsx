'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

export default function TriggersPatternsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<EmotionalSummary | null>(null);
    const [goals, setGoals] = useState<PillarGoal[]>([]);
    const [resets, setResets] = useState<CheckinRecord[]>([]);

    // Log trigger event modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [impactLabel, setImpactLabel] = useState('+1.4');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Add pattern counter-habit modal state
    const [patternModalOpen, setPatternModalOpen] = useState(false);
    const [patternTitle, setPatternTitle] = useState('');
    const [patternCadence, setPatternCadence] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('daily');
    const [patternTargetValue, setPatternTargetValue] = useState('5');
    const [patternCurrentValue, setPatternCurrentValue] = useState('0');
    const [patternUnit, setPatternUnit] = useState('resets');
    const [patternDueDate, setPatternDueDate] = useState('');
    const [patternSubmitting, setPatternSubmitting] = useState(false);

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
            setResets(Array.isArray(checkinsRes.results) ? checkinsRes.results : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load triggers & patterns.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const patternGoals = useMemo(
        () => goals.filter((g) => g.subtab_slug === 'triggers-patterns'),
        [goals]
    );

    const openPatternModal = () => {
        setPatternTitle('');
        setPatternCadence('daily');
        setPatternTargetValue('5');
        setPatternCurrentValue('0');
        setPatternUnit('resets');
        setPatternDueDate('');
        setPatternModalOpen(true);
    };

    const handleLogTriggerEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            await coreApi.createCheckin({
                pillar_slug: 'emotional',
                subtab_slug: 'triggers-patterns',
                title: title.trim(),
                note: note.trim() || undefined,
                metric_label: impactLabel.trim() || 'Logged',
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to log trigger event.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreatePatternGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patternTitle.trim()) return;
        setPatternSubmitting(true);
        setError(null);
        try {
            await coreApi.createGoal({
                pillar_slug: 'emotional',
                subtab_slug: 'triggers-patterns',
                title: patternTitle.trim(),
                cadence: patternCadence,
                target_value: Math.max(1, Number(patternTargetValue) || 1),
                current_value: Math.max(0, Number(patternCurrentValue) || 0),
                unit: patternUnit.trim() || 'resets',
                due_date: patternDueDate || null,
            });
            setPatternModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save observed pattern.');
        } finally {
            setPatternSubmitting(false);
        }
    };

    return (
        <EmotionalShell
            subtitle="Recurring stress cues, mood correlations, and calming recovery habits."
            ctaLabel="Log trigger event"
            onCtaClick={() => {
                setTitle('');
                setImpactLabel('+1.4');
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
                            <div className="text-xs text-[#707974]">Logged Events</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#974722]">
                                {resets.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Tracked cues &amp; resets</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Observed Patterns</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {patternGoals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Active pattern counter-habits</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Journal Entries</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.journal_entries_count ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Pattern reflections</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Active Boundaries</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.active_boundaries_count ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Preventive guardrails</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between gap-2 mb-3.5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                    Observed Patterns
                                </h2>
                                <button
                                    type="button"
                                    onClick={openPatternModal}
                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#BFC9C3] bg-white px-3 py-1.5 text-xs font-medium text-[#14221C] hover:bg-[#ECEEEB] transition"
                                >
                                    <Plus className="h-3.5 w-3.5 text-[#004635]" />
                                    Add pattern
                                </button>
                            </div>
                            {patternGoals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    <p>No observed patterns created yet.</p>
                                    <button
                                        type="button"
                                        onClick={openPatternModal}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add first pattern
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {patternGoals.map((g) => {
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
                                                            {g.cadence} pattern counter-habit
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
                                Effective Resets
                            </h2>
                            {resets.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No effective resets logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {resets.slice(0, 6).map((item, idx) => (
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
                                                {item.metric_label || 'Reset'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Add Observed Pattern Modal */}
            {patternModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add observed pattern
                            </h3>
                            <button
                                type="button"
                                onClick={() => setPatternModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreatePatternGoal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Pattern or Counter-Habit Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={patternTitle}
                                    onChange={(e) => setPatternTitle(e.target.value)}
                                    placeholder="e.g., 5-minute breath reset after deadline stress"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Cadence
                                    </label>
                                    <select
                                        value={patternCadence}
                                        onChange={(e) =>
                                            setPatternCadence(
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
                                        value={patternUnit}
                                        onChange={(e) => setPatternUnit(e.target.value)}
                                        placeholder="e.g., resets, walks"
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
                                        value={patternCurrentValue}
                                        onChange={(e) => setPatternCurrentValue(e.target.value)}
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
                                        value={patternTargetValue}
                                        onChange={(e) => setPatternTargetValue(e.target.value)}
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
                                    value={patternDueDate}
                                    onChange={(e) => setPatternDueDate(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setPatternModalOpen(false)}
                                    className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={patternSubmitting}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {patternSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save pattern
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Log Trigger Event Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Log trigger event
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleLogTriggerEvent} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Cue or Reset Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., 20m Outdoor Walk"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Mood Shift / Metric Label
                                </label>
                                <input
                                    type="text"
                                    value={impactLabel}
                                    onChange={(e) => setImpactLabel(e.target.value)}
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