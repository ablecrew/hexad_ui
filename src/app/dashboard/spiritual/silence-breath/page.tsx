'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Pause, Play } from 'lucide-react';
import { SpiritualShell } from '@/components/spiritual/SpiritualShell';
import { useAuth } from '@/context/AuthContext';
import { SpiritualSummary } from '@/lib/dashboard-api';
import {
    BreathSessionItem,
    spiritualApi,
} from '@/lib/spiritual-api';
import { PillarGoal } from '@/types/api';

export default function SilenceBreathPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<SpiritualSummary | null>(null);
    const [goals, setGoals] = useState<PillarGoal[]>([]);
    const [sessions, setSessions] = useState<BreathSessionItem[]>([]);

    const [timerRunning, setTimerRunning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(10 * 60);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, goalsRes, sessRes] = await Promise.all([
                spiritualApi.getSummary().catch(() => null),
                spiritualApi.getSpiritualGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                spiritualApi.getBreathSessions().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);
            setSummary(sumRes);
            setGoals(goalsRes.results);
            setSessions(sessRes.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load breath & stillness.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useEffect(() => {
        if (!timerRunning) return;
        const interval = setInterval(() => {
            setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [timerRunning]);

    const minsDisplay = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const secsDisplay = String(secondsLeft % 60).padStart(2, '0');

    return (
        <SpiritualShell
            subtitle="Breathwork cadences, unguided quiet sits, and nervous-system stillness."
            ctaLabel={timerRunning ? `${minsDisplay}:${secsDisplay} · Pause` : 'Start breath timer'}
            ctaIcon={
                timerRunning ? (
                    <Pause className="h-3.5 w-3.5" />
                ) : (
                    <Play className="h-3.5 w-3.5" />
                )
            }
            onCtaClick={() => setTimerRunning((r) => !r)}
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
                            <div className="text-xs text-[#707974]">Silence Time</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#554AB2]">
                                {summary?.total_breath_mins ?? 0}m
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Total breath &amp; quiet sits</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Breath Sessions</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {sessions.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Logged stillness sessions</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Breath Timer</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {minsDisplay}:{secsDisplay}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                {timerRunning ? 'Timer running' : 'Ready to begin'}
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Active Cadences</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Stillness routines</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Breath &amp; Stillness Cadences
                            </h2>
                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No stillness cadences created yet.
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
                                                            {g.cadence} stillness cadence
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
                                Recent Sits
                            </h2>
                            {sessions.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No breathwork or stillness sessions logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {sessions.slice(0, 6).map((s) => (
                                        <div
                                            key={s.id}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {s.title || s.cadence || 'Breath session'}
                                                </div>
                                                <div className="text-xs text-[#707974] mt-0.5 truncate">
                                                    {s.created_at.slice(0, 10)}
                                                    {s.cadence ? ` · ${s.cadence}` : ''}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#554AB2] shrink-0">
                        {s.duration_mins ? `${s.duration_mins}m` : 'Logged'}
                      </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </SpiritualShell>
    );
}