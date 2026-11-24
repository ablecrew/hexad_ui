'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { SpiritualShell } from '@/components/spiritual/SpiritualShell';
import { useAuth } from '@/context/AuthContext';
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

export default function MeditationPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<SpiritualSummary | null>(null);
    const [goals, setGoals] = useState<PillarGoal[]>([]);
    const [checkins, setCheckins] = useState<CheckinWithOptionalDates[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [durationMins, setDurationMins] = useState('15');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

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
            setGoals(goalsRes.results);
            setCheckins(Array.isArray(checkinsRes.results) ? checkinsRes.results : []);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to load meditation data.'
            );
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleLogPractice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            const mins = Math.max(1, Number(durationMins) || 15);
            await coreApi.createCheckin({
                pillar_slug: 'spiritual',
                subtab_slug: 'meditation',
                title: title.trim(),
                note: note.trim() || undefined,
                metric_label: `${mins}m`,
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to log practice.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SpiritualShell
            subtitle="Daily stillness, gratitude practice, core values, and contemplative reading."
            ctaLabel="Log practice"
            onCtaClick={() => {
                setTitle('');
                setDurationMins('15');
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
                            <div className="text-xs text-[#707974]">Mindfulness Time</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#554AB2]">
                                {summary?.total_breath_mins ?? 0}m
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Logged breath &amp; stillness
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Gratitude Notes</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.gratitude_entries_count ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Appreciation entries
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Core Values</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.values_count ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Active guiding principles
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Practice Logs</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {checkins.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Recorded spiritual check-ins
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Spiritual Practices
                            </h2>
                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No spiritual practice goals created yet.
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {goals.map((g) => {
                                        const target = Number(g.target_value) || 1;
                                        const current = Number(g.current_value) || 0;
                                        const pct = Math.min(
                                            100,
                                            Math.max(0, Math.round((current / target) * 100))
                                        );
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
                                                            {g.cadence} spiritual rhythm
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
                                Recent Practice Log
                            </h2>
                            {checkins.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No spiritual practices logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {checkins.slice(0, 6).map((item, idx) => (
                                        <div
                                            key={item.id ?? idx}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {item.title}
                                                </div>
                                                <div className="text-xs text-[#707974] mt-0.5 truncate">
                                                    {formatCheckinDate(item)}
                                                    {item.note ? ` · ${item.note}` : ''}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#554AB2] shrink-0">
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

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Log practice
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleLogPractice} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Practice Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Morning Stillness"
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
                                    required
                                    value={durationMins}
                                    onChange={(e) => setDurationMins(e.target.value)}
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
        </SpiritualShell>
    );
}