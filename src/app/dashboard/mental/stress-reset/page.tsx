'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Play, Square } from 'lucide-react';
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

export default function StressResetPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<MentalSummary | null>(null);
    const [goals, setGoals] = useState<PillarGoal[]>([]);
    const [resets, setResets] = useState<PillarCheckin[]>([]);

    const [resetActive, setResetActive] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(5 * 60);

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
            setResets(checkinsRes.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load stress resets.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useEffect(() => {
        if (!resetActive) return;
        const id = setInterval(() => {
            setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(id);
    }, [resetActive]);

    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const ss = String(secondsLeft % 60).padStart(2, '0');

    return (
        <MentalShell
            subtitle="Decompression protocols, physiological sighs, and midday cognitive resets."
            ctaLabel={resetActive ? `${mm}:${ss} · Stop reset` : 'Start 5m reset'}
            ctaIcon={
                resetActive ? (
                    <Square className="h-3.5 w-3.5" />
                ) : (
                    <Play className="h-3.5 w-3.5" />
                )
            }
            onCtaClick={() => setResetActive((r) => !r)}
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
                            <div className="text-xs text-[#707974]">Resets Logged</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#006B5A]">
                                {resets.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Recorded mental resets</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Reset Timer</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {mm}:{ss}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                {resetActive ? '5m decompression running' : '5m protocol ready'}
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Detox Minutes</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.total_detox_mins ?? 0}m
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Total recovery time</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Protocols</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Active reset routines</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Reset Protocols
                            </h2>
                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No stress reset protocols set yet.
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
                                                            {g.cadence} reset protocol
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
                                Recent Resets
                            </h2>
                            {resets.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No recent resets recorded yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {resets.slice(0, 6).map((item) => (
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
        </MentalShell>
    );
}