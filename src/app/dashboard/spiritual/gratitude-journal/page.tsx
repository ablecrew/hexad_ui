'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { SpiritualShell } from '@/components/spiritual/SpiritualShell';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api-client';
import { coreApi, SpiritualSummary } from '@/lib/dashboard-api';
import {
    formatNairobiDateString,
    GratitudeEntryItem,
    spiritualApi,
} from '@/lib/spiritual-api';
import { PillarGoal } from '@/types/api';

type GoalWithSubtab = PillarGoal & {
    subtab_slug?: string | null;
};

const GRATITUDE_PREFIX = '[Gratitude] ';

function isExcludedMeditationGoal(goal: GoalWithSubtab): boolean {
    if (goal.subtab_slug === 'meditation') return true;
    const titleLower = goal.title.toLowerCase();
    return (
        goal.title.startsWith('[Meditation] ') ||
        titleLower.includes('meditat') ||
        titleLower.includes('dawn')
    );
}

function isGratitudeGoal(goal: GoalWithSubtab): boolean {
    if (isExcludedMeditationGoal(goal)) return false;
    if (goal.subtab_slug) {
        return goal.subtab_slug === 'gratitude';
    }
    return goal.title.startsWith(GRATITUDE_PREFIX) || !goal.title.startsWith('[');
}

function cleanGoalTitle(title: string): string {
    return title.startsWith(GRATITUDE_PREFIX)
        ? title.slice(GRATITUDE_PREFIX.length)
        : title;
}

function getEntryDisplayTitle(item: GratitudeEntryItem): string {
    if (item.title?.trim()) return item.title.trim();
    if (item.entry_text?.trim()) {
        const firstLine = item.entry_text.trim().split('\n')[0];
        return firstLine.length > 64 ? `${firstLine.slice(0, 61)}...` : firstLine;
    }
    return item.note?.trim() || 'Gratitude note';
}

function getEntryDateLabel(item: GratitudeEntryItem): string {
    const raw = item.logged_date || item.created_at || '';
    return raw ? String(raw).slice(0, 10) : 'Recent';
}

export default function GratitudeJournalPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<SpiritualSummary | null>(null);
    const [goals, setGoals] = useState<GoalWithSubtab[]>([]);
    const [entries, setEntries] = useState<GratitudeEntryItem[]>([]);

    // Gratitude note modal
    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [theme, setTheme] = useState('People');
    const [body, setBody] = useState('');
    const [loggedDate, setLoggedDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Gratitude rhythm goal modal ("Add rhythm")
    const [rhythmModalOpen, setRhythmModalOpen] = useState(false);
    const [rhythmTitle, setRhythmTitle] = useState('');
    const [rhythmCadence, setRhythmCadence] = useState('daily');
    const [rhythmTarget, setRhythmTarget] = useState('30');
    const [rhythmCurrent, setRhythmCurrent] = useState('0');
    const [rhythmUnit, setRhythmUnit] = useState('notes');
    const [creatingRhythm, setCreatingRhythm] = useState(false);

    useEffect(() => {
        setLoggedDate((prev) => prev || formatNairobiDateString());
    }, []);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, goalsRes, entriesRes] = await Promise.all([
                spiritualApi.getSummary().catch(() => null),
                spiritualApi.getSpiritualGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                spiritualApi.getGratitudeEntries().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);
            setSummary(sumRes);
            const rawGoals = Array.isArray(goalsRes.results) ? goalsRes.results : [];
            setGoals(rawGoals.filter(isGratitudeGoal));
            setEntries(Array.isArray(entriesRes.results) ? entriesRes.results : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load gratitude journal.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            const trimmedTitle = title.trim();
            const trimmedBody = body.trim();
            const composedText = trimmedBody
                ? `${trimmedTitle} — ${trimmedBody}`
                : trimmedTitle;
            const dateStr = loggedDate.trim() || formatNairobiDateString();

            await spiritualApi.createGratitudeEntry({
                entry_text: composedText,
                logged_date: dateStr,
                title: trimmedTitle,
                theme: theme.trim() || 'People',
                body: trimmedBody || undefined,
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save gratitude note.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddRhythmGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rhythmTitle.trim()) return;
        setCreatingRhythm(true);
        setError(null);
        try {
            const targetVal = Math.max(1, Number(rhythmTarget) || 1);
            const currentVal = Math.max(0, Number(rhythmCurrent) || 0);
            const rawTitle = cleanGoalTitle(rhythmTitle.trim());
            const unitLabel = rhythmUnit.trim() || 'notes';

            const createdGoal = await apiFetch<GoalWithSubtab>('/core/goals/', {
                method: 'POST',
                body: JSON.stringify({
                    pillar_slug: 'spiritual',
                    subtab_slug: 'gratitude',
                    title: `${GRATITUDE_PREFIX}${rawTitle}`,
                    cadence: rhythmCadence,
                    target_value: targetVal,
                    current_value: currentVal,
                    unit: unitLabel,
                }),
            });

            await coreApi
                .createCheckin({
                    pillar_slug: 'spiritual',
                    subtab_slug: 'gratitude',
                    title: `New Gratitude Rhythm: ${rawTitle}`,
                    note: `${rhythmCadence} target: ${targetVal} ${unitLabel}`,
                    metric_label: 'Rhythm added',
                })
                .catch(() => null);

            setGoals((prev) => [
                { ...createdGoal, subtab_slug: createdGoal.subtab_slug ?? 'gratitude' },
                ...prev,
            ]);
            setRhythmModalOpen(false);
            await loadData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Unable to save gratitude rhythm goal.'
            );
        } finally {
            setCreatingRhythm(false);
        }
    };

    return (
        <SpiritualShell
            subtitle="Daily appreciations, quiet moments of thanks, and gratitude reflections."
            ctaLabel="Add gratitude note"
            onCtaClick={() => {
                setTitle('');
                setTheme('People');
                setBody('');
                setLoggedDate(formatNairobiDateString());
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
                            <div className="text-xs text-[#707974]">Total Entries</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#554AB2]">
                                {summary?.gratitude_entries_count ?? entries.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Recorded appreciations</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Recent Notes</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {entries.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Journal reflections</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Mindfulness Time</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.total_breath_mins ?? 0}m
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Stillness anchor</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Top Theme</div>
                            <div className="mt-2 font-serif text-2xl font-semibold text-[#111D18]">
                                {entries[0]?.theme || 'People'}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Most frequent focus</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between gap-3 mb-3.5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                    Gratitude Rhythms
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRhythmTitle('');
                                        setRhythmCadence('daily');
                                        setRhythmTarget('30');
                                        setRhythmCurrent('0');
                                        setRhythmUnit('notes');
                                        setRhythmModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1B5E4B] transition"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add rhythm
                                </button>
                            </div>

                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    <p>No gratitude rhythm targets created yet.</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRhythmTitle('');
                                            setRhythmCadence('daily');
                                            setRhythmTarget('30');
                                            setRhythmCurrent('0');
                                            setRhythmUnit('notes');
                                            setRhythmModalOpen(true);
                                        }}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#004635] px-3 py-1.5 text-xs font-medium text-[#004635] hover:bg-[#F2F6F4]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add rhythm
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
                                                            {g.cadence} gratitude rhythm
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
                                                    {current} / {target} {g.unit || 'notes'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Recent Appreciations
                            </h2>
                            {entries.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No gratitude notes saved yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {entries.slice(0, 6).map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {getEntryDisplayTitle(item)}
                                                </div>
                                                <div className="text-xs text-[#707974] mt-0.5 truncate">
                                                    {getEntryDateLabel(item)}
                                                    {item.theme ? ` · ${item.theme}` : ''}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#554AB2] shrink-0">
                                                {item.theme || 'Note'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Add Gratitude Note Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add gratitude note
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddNote} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Quiet Sunlight on Desk"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Theme
                                    </label>
                                    <input
                                        type="text"
                                        value={theme}
                                        onChange={(e) => setTheme(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Date Logged
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={loggedDate}
                                        onChange={(e) => setLoggedDate(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Reflection (optional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
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

            {/* Add Gratitude Rhythm Goal Modal */}
            {rhythmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add gratitude rhythm
                            </h3>
                            <button
                                type="button"
                                onClick={() => setRhythmModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddRhythmGoal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Rhythm Goal Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={rhythmTitle}
                                    onChange={(e) => setRhythmTitle(e.target.value)}
                                    placeholder="e.g., Three Evening Appreciations"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Cadence
                                    </label>
                                    <select
                                        value={rhythmCadence}
                                        onChange={(e) => setRhythmCadence(e.target.value)}
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
                                        value={rhythmUnit}
                                        onChange={(e) => setRhythmUnit(e.target.value)}
                                        placeholder="e.g., notes, entries"
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
                                        value={rhythmCurrent}
                                        onChange={(e) => setRhythmCurrent(e.target.value)}
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
                                        value={rhythmTarget}
                                        onChange={(e) => setRhythmTarget(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setRhythmModalOpen(false)}
                                    className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingRhythm}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {creatingRhythm && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save rhythm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </SpiritualShell>
    );
}