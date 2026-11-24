'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Moon, X } from 'lucide-react';
import { PhysicalShell } from '@/components/physical/PhysicalShell';
import { useAuth } from '@/context/AuthContext';
import { PhysicalSummary } from '@/lib/dashboard-api';
import { physicalApi, PhysicalLogItem } from '@/lib/physical-api';
import { PillarGoal } from '@/types/api';

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
    const [goals, setGoals] = useState<PillarGoal[]>([]);
    const [sleepLogs, setSleepLogs] = useState<PhysicalLogItem[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [durationLabel, setDurationLabel] = useState('7h 50m');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

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
            setGoals(goalsRes.results);
            setSleepLogs(logsRes.results);
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
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Recovery Targets
                            </h2>
                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No recovery targets set yet.
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
        </PhysicalShell>
    );
}