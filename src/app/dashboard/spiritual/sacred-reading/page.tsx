'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { SpiritualShell } from '@/components/spiritual/SpiritualShell';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api-client';
import { coreApi, PillarCheckin } from '@/lib/dashboard-api';
import { spiritualApi } from '@/lib/spiritual-api';
import { PillarGoal } from '@/types/api';

type GoalWithSubtab = PillarGoal & {
    subtab_slug?: string | null;
};

const READING_PREFIX = '[Reading] ';

function isExcludedMeditationGoal(goal: GoalWithSubtab): boolean {
    if (goal.subtab_slug === 'meditation') return true;
    const titleLower = goal.title.toLowerCase();
    return (
        goal.title.startsWith('[Meditation] ') ||
        titleLower.includes('meditat') ||
        titleLower.includes('dawn')
    );
}

function isReadingGoal(goal: GoalWithSubtab): boolean {
    if (isExcludedMeditationGoal(goal)) return false;
    if (goal.subtab_slug) {
        return goal.subtab_slug === 'sacred-reading';
    }
    return goal.title.startsWith(READING_PREFIX) || !goal.title.startsWith('[');
}

function cleanGoalTitle(title: string): string {
    return title.startsWith(READING_PREFIX)
        ? title.slice(READING_PREFIX.length)
        : title;
}

export default function SacredReadingPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [goals, setGoals] = useState<GoalWithSubtab[]>([]);
    const [passages, setPassages] = useState<PillarCheckin[]>([]);

    // Save passage modal
    const [modalOpen, setModalOpen] = useState(false);
    const [passageText, setPassageText] = useState('');
    const [sourceRef, setSourceRef] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Add contemplative text goal modal ("Add text")
    const [textModalOpen, setTextModalOpen] = useState(false);
    const [textTitle, setTextTitle] = useState('');
    const [textCadence, setTextCadence] = useState('daily');
    const [textTarget, setTextTarget] = useState('120');
    const [textCurrent, setTextCurrent] = useState('0');
    const [textUnit, setTextUnit] = useState('pages read');
    const [creatingText, setCreatingText] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [goalsRes, checkinsRes] = await Promise.all([
                spiritualApi.getSpiritualGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                coreApi.getCheckins('spiritual').catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);
            const rawGoals = Array.isArray(goalsRes.results) ? goalsRes.results : [];
            setGoals(rawGoals.filter(isReadingGoal));
            setPassages(
                (Array.isArray(checkinsRes.results) ? checkinsRes.results : []).filter(
                    (c) => c.subtab_slug === 'sacred-reading' || c.title.startsWith('"')
                )
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sacred reading.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleSavePassage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passageText.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            const formatted = passageText.trim().startsWith('"')
                ? passageText.trim()
                : `"${passageText.trim()}"`;
            await coreApi.createCheckin({
                pillar_slug: 'spiritual',
                subtab_slug: 'sacred-reading',
                title: formatted,
                note: sourceRef.trim() || 'Contemplative reading',
                metric_label: 'Saved',
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save passage.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddTextGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!textTitle.trim()) return;
        setCreatingText(true);
        setError(null);
        try {
            const targetVal = Math.max(1, Number(textTarget) || 1);
            const currentVal = Math.max(0, Number(textCurrent) || 0);
            const rawTitle = cleanGoalTitle(textTitle.trim());
            const unitLabel = textUnit.trim() || 'pages read';

            const createdGoal = await apiFetch<GoalWithSubtab>('/core/goals/', {
                method: 'POST',
                body: JSON.stringify({
                    pillar_slug: 'spiritual',
                    subtab_slug: 'sacred-reading',
                    title: `${READING_PREFIX}${rawTitle}`,
                    cadence: textCadence,
                    target_value: targetVal,
                    current_value: currentVal,
                    unit: unitLabel,
                }),
            });

            await coreApi
                .createCheckin({
                    pillar_slug: 'spiritual',
                    subtab_slug: 'sacred-reading',
                    title: `Added Reading Text: ${rawTitle}`,
                    note: `${textCadence} goal: ${targetVal} ${unitLabel}`,
                    metric_label: 'Text added',
                })
                .catch(() => null);

            setGoals((prev) => [
                { ...createdGoal, subtab_slug: createdGoal.subtab_slug ?? 'sacred-reading' },
                ...prev,
            ]);
            setTextModalOpen(false);
            await loadData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Unable to save reading text goal.'
            );
        } finally {
            setCreatingText(false);
        }
    };

    return (
        <SpiritualShell
            subtitle="Wisdom literature, reflective passages, and slow daily reading."
            ctaLabel="Save passage"
            onCtaClick={() => {
                setPassageText('');
                setSourceRef('');
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
                            <div className="text-xs text-[#707974]">Active Texts</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#554AB2]">
                                {goals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Philosophy &amp; mindfulness</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Saved Passages</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {passages.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Highlighted quotes</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Pages Read</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.reduce((a, g) => a + (Number(g.current_value) || 0), 0)}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Across active readings</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Reading Cadence</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                Daily
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Slow contemplative pace</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between gap-3 mb-3.5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                    Contemplative Texts
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTextTitle('');
                                        setTextCadence('daily');
                                        setTextTarget('120');
                                        setTextCurrent('0');
                                        setTextUnit('pages read');
                                        setTextModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1B5E4B] transition"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add text
                                </button>
                            </div>

                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    <p>No reading texts added yet.</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTextTitle('');
                                            setTextCadence('daily');
                                            setTextTarget('120');
                                            setTextCurrent('0');
                                            setTextUnit('pages read');
                                            setTextModalOpen(true);
                                        }}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#004635] px-3 py-1.5 text-xs font-medium text-[#004635] hover:bg-[#F2F6F4]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add text
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
                                                            {g.cadence} reading goal
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
                                                    {current} of {target} {g.unit || 'pages read'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Saved Passages
                            </h2>
                            {passages.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No passages saved yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {passages.slice(0, 6).map((p, idx) => (
                                        <div
                                            key={p.id ?? idx}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {p.title}
                                                </div>
                                                <div className="text-xs text-[#707974] mt-0.5 truncate">
                                                    {p.note || 'Contemplative reading'}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#554AB2] shrink-0">
                                                {p.created_at ? String(p.created_at).slice(0, 10) : 'Saved'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Save Passage Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Save passage
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSavePassage} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Quote or Passage
                                </label>
                                <textarea
                                    rows={3}
                                    required
                                    value={passageText}
                                    onChange={(e) => setPassageText(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Source / Chapter
                                </label>
                                <input
                                    type="text"
                                    value={sourceRef}
                                    onChange={(e) => setSourceRef(e.target.value)}
                                    placeholder="e.g., Meditations · Book X, 16"
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

            {/* Add Contemplative Text Goal Modal */}
            {textModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add contemplative text
                            </h3>
                            <button
                                type="button"
                                onClick={() => setTextModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddTextGoal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Book or Text Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={textTitle}
                                    onChange={(e) => setTextTitle(e.target.value)}
                                    placeholder="e.g., Meditations — Marcus Aurelius"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Cadence
                                    </label>
                                    <select
                                        value={textCadence}
                                        onChange={(e) => setTextCadence(e.target.value)}
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
                                        value={textUnit}
                                        onChange={(e) => setTextUnit(e.target.value)}
                                        placeholder="e.g., pages read, chapters"
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
                                        value={textCurrent}
                                        onChange={(e) => setTextCurrent(e.target.value)}
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
                                        value={textTarget}
                                        onChange={(e) => setTextTarget(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setTextModalOpen(false)}
                                    className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingText}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {creatingText && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save text
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </SpiritualShell>
    );
}