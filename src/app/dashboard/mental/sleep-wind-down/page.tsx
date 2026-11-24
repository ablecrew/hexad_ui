'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { MentalShell } from '@/components/mental/MentalShell';
import { useAuth } from '@/context/AuthContext';
import {
    coreApi,
    MentalSummary,
    PillarCheckin,
} from '@/lib/dashboard-api';
import { mentalApi } from '@/lib/mental-api';
import { PillarGoal } from '@/types/api';

function formatShortDate(iso?: string | null): string {
    if (!iso) return 'Recent';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return String(iso).slice(0, 10) || 'Recent';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SleepWindDownPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<MentalSummary | null>(null);
    const [goals, setGoals] = useState<PillarGoal[]>([]);
    const [nights, setNights] = useState<PillarCheckin[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [clarityRating, setClarityRating] = useState('4.5');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, goalsRes, checkinsRes] = await Promise.all([
                mentalApi.getSummary().catch(() => null),
                mentalApi.getMentalGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                coreApi.getCheckins('mental').catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);
            setSummary(sumRes);
            setGoals(goalsRes.results);
            setNights(checkinsRes.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sleep wind-down.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleLogWindDown = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            await coreApi.createCheckin({
                pillar_slug: 'mental',
                subtab_slug: 'sleep-wind-down',
                title: title.trim(),
                note: note.trim() || undefined,
                metric_label: clarityRating.trim() || '4.5',
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save wind-down.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <MentalShell
            subtitle="Evening decompression, lights-out consistency, and restful sleep prep."
            ctaLabel="Log wind-down"
            onCtaClick={() => {
                setTitle('');
                setClarityRating('4.5');
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
                            <div className="text-xs text-[#707974]">Logged Nights</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#006B5A]">
                                {nights.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Evening wind-down entries</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Evening Rituals</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Active wind-down goals</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Detox Minutes</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.total_detox_mins ?? 0}m
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Screen-free minutes</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Cognitive Notes</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.cognitive_notes_count ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Evening reflections</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Evening Rituals
                            </h2>
                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No evening rituals set yet.
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {goals.map((g) => {
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
                                                            {g.cadence} evening ritual
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
                                Recent Nights
                            </h2>
                            {nights.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No recent wind-down nights logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {nights.slice(0, 6).map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {item.title}
                                                </div>
                                                <div className="text-xs text-[#707974] mt-0.5 truncate">
                                                    {formatShortDate(item.created_at)}
                                                    {item.note ? ` · ${item.note}` : ''}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#006B5A] shrink-0">
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
                                Log wind-down
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleLogWindDown} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Evening Summary
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Last Night · 10:25 PM"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Clarity Score (out of 5)
                                </label>
                                <input
                                    type="text"
                                    value={clarityRating}
                                    onChange={(e) => setClarityRating(e.target.value)}
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
        </MentalShell>
    );
}