'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { EmotionalShell } from '@/components/emotional/EmotionalShell';
import { useAuth } from '@/context/AuthContext';
import { coreApi, EmotionalSummary } from '@/lib/dashboard-api';
import { emotionalApi, EmotionalLogItem } from '@/lib/emotional-api';
import { PillarGoal } from '@/types/api';

function formatShortDate(item: EmotionalLogItem): string {
    const raw = item.created_at ?? item.logged_at ?? item.date;
    if (!raw) return 'Recent';
    const str = String(raw);
    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return str.slice(0, 10) || 'Recent';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BoundariesPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<EmotionalSummary | null>(null);
    const [goals, setGoals] = useState<PillarGoal[]>([]);
    const [boundaryWins, setBoundaryWins] = useState<EmotionalLogItem[]>([]);

    // Add boundary rule / win modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [statusLabel, setStatusLabel] = useState('Held');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Add boundary goal modal state
    const [ruleGoalModalOpen, setRuleGoalModalOpen] = useState(false);
    const [ruleGoalTitle, setRuleGoalTitle] = useState('');
    const [ruleGoalCadence, setRuleGoalCadence] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('daily');
    const [ruleGoalTargetValue, setRuleGoalTargetValue] = useState('7');
    const [ruleGoalCurrentValue, setRuleGoalCurrentValue] = useState('0');
    const [ruleGoalUnit, setRuleGoalUnit] = useState('days');
    const [ruleGoalDueDate, setRuleGoalDueDate] = useState('');
    const [ruleGoalSubmitting, setRuleGoalSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, goalsRes, boundariesRes] = await Promise.all([
                emotionalApi.getSummary().catch(() => null),
                emotionalApi.getEmotionalGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                emotionalApi.getBoundaries(),
            ]);
            setSummary(sumRes);
            setGoals(goalsRes.results);
            setBoundaryWins(boundariesRes.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load boundaries.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const boundaryGoals = useMemo(
        () => goals.filter((g) => g.subtab_slug === 'boundaries'),
        [goals]
    );

    const openRuleGoalModal = () => {
        setRuleGoalTitle('');
        setRuleGoalCadence('daily');
        setRuleGoalTargetValue('7');
        setRuleGoalCurrentValue('0');
        setRuleGoalUnit('days');
        setRuleGoalDueDate('');
        setRuleGoalModalOpen(true);
    };

    const handleAddBoundaryRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            await emotionalApi.createBoundary({
                title: title.trim(),
                metric_label: statusLabel.trim() || 'Held',
                note: note.trim() || undefined,
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save boundary rule.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateBoundaryGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ruleGoalTitle.trim()) return;
        setRuleGoalSubmitting(true);
        setError(null);
        try {
            await coreApi.createGoal({
                pillar_slug: 'emotional',
                subtab_slug: 'boundaries',
                title: ruleGoalTitle.trim(),
                cadence: ruleGoalCadence,
                target_value: Math.max(1, Number(ruleGoalTargetValue) || 1),
                current_value: Math.max(0, Number(ruleGoalCurrentValue) || 0),
                unit: ruleGoalUnit.trim() || 'days',
                due_date: ruleGoalDueDate || null,
            });
            setRuleGoalModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save boundary goal.');
        } finally {
            setRuleGoalSubmitting(false);
        }
    };

    return (
        <EmotionalShell
            subtitle="Personal limits, protected recovery hours, and energy-preserving commitments."
            ctaLabel="Add boundary rule"
            onCtaClick={() => {
                setTitle('');
                setStatusLabel('Held');
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
                            <div className="text-xs text-[#707974]">Active Boundaries</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#974722]">
                                {summary?.active_boundaries_count ?? boundaryWins.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Time, work &amp; rest rules</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Boundary Wins</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {boundaryWins.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Logged boundary moments</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Boundary Goals</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {boundaryGoals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Tracked commitments</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Journal Entries</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.journal_entries_count ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Emotional check-ins</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between gap-2 mb-3.5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                    Active Boundary Rules
                                </h2>
                                <button
                                    type="button"
                                    onClick={openRuleGoalModal}
                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#BFC9C3] bg-white px-3 py-1.5 text-xs font-medium text-[#14221C] hover:bg-[#ECEEEB] transition"
                                >
                                    <Plus className="h-3.5 w-3.5 text-[#004635]" />
                                    Add boundary goal
                                </button>
                            </div>
                            {boundaryGoals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    <p>No boundary goals created yet.</p>
                                    <button
                                        type="button"
                                        onClick={openRuleGoalModal}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add first boundary goal
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {boundaryGoals.map((g) => {
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
                                                            {g.cadence} boundary rule
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
                                Recent Boundary Wins
                            </h2>
                            {boundaryWins.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No boundary wins logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {boundaryWins.slice(0, 6).map((item, idx) => (
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
                                                {item.metric_label || 'Held'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Add Boundary Goal Modal */}
            {ruleGoalModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add boundary goal
                            </h3>
                            <button
                                type="button"
                                onClick={() => setRuleGoalModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateBoundaryGoal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Boundary Goal Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={ruleGoalTitle}
                                    onChange={(e) => setRuleGoalTitle(e.target.value)}
                                    placeholder="e.g., Shut down work devices by 7:30 PM"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Cadence
                                    </label>
                                    <select
                                        value={ruleGoalCadence}
                                        onChange={(e) =>
                                            setRuleGoalCadence(
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
                                        value={ruleGoalUnit}
                                        onChange={(e) => setRuleGoalUnit(e.target.value)}
                                        placeholder="e.g., days, evenings"
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
                                        value={ruleGoalCurrentValue}
                                        onChange={(e) => setRuleGoalCurrentValue(e.target.value)}
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
                                        value={ruleGoalTargetValue}
                                        onChange={(e) => setRuleGoalTargetValue(e.target.value)}
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
                                    value={ruleGoalDueDate}
                                    onChange={(e) => setRuleGoalDueDate(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setRuleGoalModalOpen(false)}
                                    className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={ruleGoalSubmitting}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {ruleGoalSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save boundary goal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Boundary Rule / Win Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add boundary rule
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddBoundaryRule} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Boundary Rule or Win
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., No Work Messages After 8 PM"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Status Label
                                </label>
                                <input
                                    type="text"
                                    value={statusLabel}
                                    onChange={(e) => setStatusLabel(e.target.value)}
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