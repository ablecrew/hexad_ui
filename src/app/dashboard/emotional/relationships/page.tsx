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

export default function RelationshipsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<EmotionalSummary | null>(null);
    const [goals, setGoals] = useState<PillarGoal[]>([]);
    const [connections, setConnections] = useState<CheckinRecord[]>([]);

    // Log connection modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [ratingLabel, setRatingLabel] = useState('4.8');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Add cadence goal modal state
    const [cadenceModalOpen, setCadenceModalOpen] = useState(false);
    const [cadenceTitle, setCadenceTitle] = useState('');
    const [cadenceFrequency, setCadenceFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('weekly');
    const [cadenceTargetValue, setCadenceTargetValue] = useState('3');
    const [cadenceCurrentValue, setCadenceCurrentValue] = useState('0');
    const [cadenceUnit, setCadenceUnit] = useState('check-ins');
    const [cadenceDueDate, setCadenceDueDate] = useState('');
    const [cadenceSubmitting, setCadenceSubmitting] = useState(false);

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
            setConnections(Array.isArray(checkinsRes.results) ? checkinsRes.results : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load relationships.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const relationshipGoals = useMemo(
        () => goals.filter((g) => g.subtab_slug === 'relationships'),
        [goals]
    );

    const openCadenceModal = () => {
        setCadenceTitle('');
        setCadenceFrequency('weekly');
        setCadenceTargetValue('3');
        setCadenceCurrentValue('0');
        setCadenceUnit('check-ins');
        setCadenceDueDate('');
        setCadenceModalOpen(true);
    };

    const handleLogConnection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            await coreApi.createCheckin({
                pillar_slug: 'emotional',
                subtab_slug: 'relationships',
                title: title.trim(),
                note: note.trim() || undefined,
                metric_label: ratingLabel.trim() || 'Connected',
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save connection.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateCadenceGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cadenceTitle.trim()) return;
        setCadenceSubmitting(true);
        setError(null);
        try {
            await coreApi.createGoal({
                pillar_slug: 'emotional',
                subtab_slug: 'relationships',
                title: cadenceTitle.trim(),
                cadence: cadenceFrequency,
                target_value: Math.max(1, Number(cadenceTargetValue) || 1),
                current_value: Math.max(0, Number(cadenceCurrentValue) || 0),
                unit: cadenceUnit.trim() || 'check-ins',
                due_date: cadenceDueDate || null,
            });
            setCadenceModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save connection cadence goal.');
        } finally {
            setCadenceSubmitting(false);
        }
    };

    return (
        <EmotionalShell
            subtitle="Intentional check-ins, inner circle care, and meaningful conversations."
            ctaLabel="Log connection"
            onCtaClick={() => {
                setTitle('');
                setRatingLabel('4.8');
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
                            <div className="text-xs text-[#707974]">Logged Check-ins</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#974722]">
                                {connections.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Recorded connections</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Cadence Goals</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {relationshipGoals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Active inner-circle goals</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Journal Entries</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.journal_entries_count ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Relational notes</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Active Boundaries</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.active_boundaries_count ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Healthy limits</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between gap-2 mb-3.5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                    Connection Cadence
                                </h2>
                                <button
                                    type="button"
                                    onClick={openCadenceModal}
                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#BFC9C3] bg-white px-3 py-1.5 text-xs font-medium text-[#14221C] hover:bg-[#ECEEEB] transition"
                                >
                                    <Plus className="h-3.5 w-3.5 text-[#004635]" />
                                    Add cadence
                                </button>
                            </div>
                            {relationshipGoals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    <p>No connection cadence goals set yet.</p>
                                    <button
                                        type="button"
                                        onClick={openCadenceModal}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add first cadence goal
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {relationshipGoals.map((g) => {
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
                                                            {g.cadence} connection cadence
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
                                Recent Connections
                            </h2>
                            {connections.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No recent connections logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {connections.slice(0, 6).map((item, idx) => (
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
                                                {item.metric_label || 'Connected'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Add Connection Cadence Goal Modal */}
            {cadenceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add connection cadence
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCadenceModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateCadenceGoal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Cadence Goal Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={cadenceTitle}
                                    onChange={(e) => setCadenceTitle(e.target.value)}
                                    placeholder="e.g., Weekly family & close-friend calls"
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
                                        onChange={(e) =>
                                            setCadenceFrequency(
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
                                        value={cadenceUnit}
                                        onChange={(e) => setCadenceUnit(e.target.value)}
                                        placeholder="e.g., check-ins, calls"
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
                                        value={cadenceCurrentValue}
                                        onChange={(e) => setCadenceCurrentValue(e.target.value)}
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
                                        value={cadenceTargetValue}
                                        onChange={(e) => setCadenceTargetValue(e.target.value)}
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
                                    value={cadenceDueDate}
                                    onChange={(e) => setCadenceDueDate(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
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
                                    disabled={cadenceSubmitting}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {cadenceSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save cadence
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Log Connection Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Log connection
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleLogConnection} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Connection Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Call with Mom"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Connection Score / Label
                                </label>
                                <input
                                    type="text"
                                    value={ratingLabel}
                                    onChange={(e) => setRatingLabel(e.target.value)}
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