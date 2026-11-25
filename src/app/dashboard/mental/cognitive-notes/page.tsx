'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { MentalShell } from '@/components/mental/MentalShell';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api-client';
import { coreApi, MentalSummary } from '@/lib/dashboard-api';
import { mentalApi, MentalLogItem } from '@/lib/mental-api';
import { PillarGoal } from '@/types/api';

type GoalWithSubtab = PillarGoal & {
    subtab_slug?: string | null;
};

const FRAMEWORK_PREFIX = '[Framework] ';
const OTHER_MENTAL_PREFIXES = ['[Mood] ', '[Journal] ', '[Detox] ', '[Calm] '];
const OTHER_MENTAL_SLUGS = ['mood', 'journal', 'detox', 'calm'];

function isCognitiveFrameworkGoal(goal: GoalWithSubtab): boolean {
    if (goal.subtab_slug === 'cognitive-notes') return true;
    if (goal.subtab_slug && OTHER_MENTAL_SLUGS.includes(goal.subtab_slug)) return false;

    const lowerTitle = goal.title.toLowerCase();
    if (goal.title.startsWith(FRAMEWORK_PREFIX)) return true;
    if (OTHER_MENTAL_PREFIXES.some((prefix) => goal.title.startsWith(prefix))) return false;

    return (
        lowerTitle.includes('framework') ||
        lowerTitle.includes('reframe') ||
        lowerTitle.includes('mental model') ||
        !goal.title.startsWith('[')
    );
}

function cleanGoalTitle(title: string): string {
    return title.startsWith(FRAMEWORK_PREFIX)
        ? title.slice(FRAMEWORK_PREFIX.length)
        : title;
}

function formatShortDate(iso?: string | null): string {
    if (!iso) return 'Recent';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return String(iso).slice(0, 10) || 'Recent';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CognitiveNotesPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<MentalSummary | null>(null);
    const [goals, setGoals] = useState<GoalWithSubtab[]>([]);
    const [notes, setNotes] = useState<MentalLogItem[]>([]);

    // New cognitive note modal
    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [mins, setMins] = useState('8');
    const [noteText, setNoteText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Add framework goal modal ("Add framework")
    const [frameworkModalOpen, setFrameworkModalOpen] = useState(false);
    const [frameworkTitle, setFrameworkTitle] = useState('');
    const [frameworkCadence, setFrameworkCadence] = useState('weekly');
    const [frameworkTarget, setFrameworkTarget] = useState('5');
    const [frameworkCurrent, setFrameworkCurrent] = useState('0');
    const [frameworkUnit, setFrameworkUnit] = useState('reframes');
    const [creatingFramework, setCreatingFramework] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, goalsRes, notesRes] = await Promise.all([
                mentalApi.getSummary().catch(() => null),
                mentalApi.getMentalGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                mentalApi.getCognitiveNotes(),
            ]);
            setSummary(sumRes);
            const rawGoals = Array.isArray(goalsRes.results) ? goalsRes.results : [];
            setGoals(rawGoals.filter(isCognitiveFrameworkGoal));
            setNotes(Array.isArray(notesRes.results) ? notesRes.results : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load cognitive notes.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleNewCognitiveNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            await mentalApi.createCognitiveNote({
                title: title.trim(),
                duration_mins: Math.max(1, Number(mins) || 8),
                note: noteText.trim() || undefined,
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save cognitive note.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddFrameworkGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!frameworkTitle.trim()) return;
        setCreatingFramework(true);
        setError(null);
        try {
            const targetVal = Math.max(1, Number(frameworkTarget) || 1);
            const currentVal = Math.max(0, Number(frameworkCurrent) || 0);
            const rawTitle = cleanGoalTitle(frameworkTitle.trim());
            const unitLabel = frameworkUnit.trim() || 'reframes';

            const createdGoal = await apiFetch<GoalWithSubtab>('/core/goals/', {
                method: 'POST',
                body: JSON.stringify({
                    pillar_slug: 'mental',
                    subtab_slug: 'cognitive-notes',
                    title: `${FRAMEWORK_PREFIX}${rawTitle}`,
                    cadence: frameworkCadence,
                    target_value: targetVal,
                    current_value: currentVal,
                    unit: unitLabel,
                }),
            });

            await coreApi
                .createCheckin({
                    pillar_slug: 'mental',
                    subtab_slug: 'cognitive-notes',
                    title: `New Cognitive Framework: ${rawTitle}`,
                    note: `${frameworkCadence} target: ${targetVal} ${unitLabel}`,
                    metric_label: 'Framework added',
                })
                .catch(() => null);

            setGoals((prev) => [
                { ...createdGoal, subtab_slug: createdGoal.subtab_slug ?? 'cognitive-notes' },
                ...prev,
            ]);
            setFrameworkModalOpen(false);
            await loadData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Unable to save cognitive framework.'
            );
        } finally {
            setCreatingFramework(false);
        }
    };

    return (
        <MentalShell
            subtitle="Thought reframing, mental models, and quick brain-dump clarity."
            ctaLabel="New cognitive note"
            onCtaClick={() => {
                setTitle('');
                setMins('8');
                setNoteText('');
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
                            <div className="text-xs text-[#707974]">Cognitive Notes</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#006B5A]">
                                {summary?.cognitive_notes_count ?? notes.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Reframes &amp; brain dumps</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Saved Notes</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {notes.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Logged entries</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Frameworks</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Active mental models</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Detox Minutes</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.total_detox_mins ?? 0}m
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Calm baseline</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between gap-3 mb-3.5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                    Active Frameworks
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFrameworkTitle('');
                                        setFrameworkCadence('weekly');
                                        setFrameworkTarget('5');
                                        setFrameworkCurrent('0');
                                        setFrameworkUnit('reframes');
                                        setFrameworkModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1B5E4B] transition"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add framework
                                </button>
                            </div>

                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    <p>No cognitive frameworks set yet.</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFrameworkTitle('');
                                            setFrameworkCadence('weekly');
                                            setFrameworkTarget('5');
                                            setFrameworkCurrent('0');
                                            setFrameworkUnit('reframes');
                                            setFrameworkModalOpen(true);
                                        }}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#004635] px-3 py-1.5 text-xs font-medium text-[#004635] hover:bg-[#F2F6F4]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add framework
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
                                                            {g.cadence} framework
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
                                Recent Notes
                            </h2>
                            {notes.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No cognitive notes logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {notes.slice(0, 6).map((n) => (
                                        <div
                                            key={n.id}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {n.title}
                                                </div>
                                                <div className="text-xs text-[#707974] mt-0.5 truncate">
                                                    {formatShortDate(n.created_at)}
                                                    {n.note ? ` · ${n.note}` : ''}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#006B5A] shrink-0">
                                                {n.duration_mins ? `${n.duration_mins}m` : 'Note'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* New Cognitive Note Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                New cognitive note
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleNewCognitiveNote} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Cognitive Reframe Note"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Duration (minutes)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={mins}
                                    onChange={(e) => setMins(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Note
                                </label>
                                <textarea
                                    rows={2}
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
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

            {/* Add Cognitive Framework Goal Modal */}
            {frameworkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add framework
                            </h3>
                            <button
                                type="button"
                                onClick={() => setFrameworkModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddFrameworkGoal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Framework Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={frameworkTitle}
                                    onChange={(e) => setFrameworkTitle(e.target.value)}
                                    placeholder="e.g., First-Principles Check"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Cadence
                                    </label>
                                    <select
                                        value={frameworkCadence}
                                        onChange={(e) => setFrameworkCadence(e.target.value)}
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
                                        value={frameworkUnit}
                                        onChange={(e) => setFrameworkUnit(e.target.value)}
                                        placeholder="e.g., reframes, sessions"
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
                                        value={frameworkCurrent}
                                        onChange={(e) => setFrameworkCurrent(e.target.value)}
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
                                        value={frameworkTarget}
                                        onChange={(e) => setFrameworkTarget(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setFrameworkModalOpen(false)}
                                    className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingFramework}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {creatingFramework && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save framework
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MentalShell>
    );
}