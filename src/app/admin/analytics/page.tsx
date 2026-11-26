'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAuth } from '@/context/AuthContext';
import { adminApi, AdminAnalyticsStats } from '@/lib/admin-api';
import { isAdminUser } from '@/lib/rbac';

const LAST_USER_KEY = 'hexad:last_user_id';
const CACHE_TTL_MS = 10 * 60 * 1000;

function getLastUserId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage.getItem(LAST_USER_KEY);
    } catch {
        return null;
    }
}

function setLastUserId(userId?: string | number | null): void {
    if (!userId || typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(LAST_USER_KEY, String(userId));
    } catch {
        // ignore storage errors
    }
}

function getAdminAnalyticsCacheKey(userId?: string | number | null): string | null {
    const resolvedId = userId ? String(userId) : getLastUserId();
    if (!resolvedId) return null;
    return `hexad:admin:analytics:${resolvedId}`;
}

function readAdminAnalyticsCache(key: string | null): AdminAnalyticsStats | null {
    if (!key || typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as {
            data?: AdminAnalyticsStats;
            savedAt?: number;
        };
        if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
            return null;
        }
        return parsed.data ?? null;
    } catch {
        return null;
    }
}

function writeAdminAnalyticsCache(key: string | null, data: AdminAnalyticsStats): void {
    if (!key || typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }));
    } catch {
        // ignore storage errors
    }
}

export default function AdminAnalyticsPage() {
    const { user } = useAuth();
    const userId = user?.id;

    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [analytics, setAnalytics] = useState<AdminAnalyticsStats | null>(null);

    useEffect(() => {
        if (userId) {
            setLastUserId(userId);
        }
    }, [userId]);

    // Hydrate from localStorage after mount so SSR and initial client HTML stay aligned
    useEffect(() => {
        const cached = readAdminAnalyticsCache(getAdminAnalyticsCacheKey(userId));
        if (cached) {
            setAnalytics((prev) => prev ?? cached);
            setLoading(false);
        }
    }, [userId]);

    const loadAnalytics = useCallback(async () => {
        if (!user || !isAdminUser(user)) return;
        const activeKey = getAdminAnalyticsCacheKey(user.id);
        const cached = readAdminAnalyticsCache(activeKey);

        if (cached) {
            setAnalytics((prev) => prev ?? cached);
            setLoading(false);
        } else {
            setLoading(true);
        }

        try {
            const res = await adminApi.getAnalytics();
            setAnalytics(res);
            writeAdminAnalyticsCache(activeKey, res);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadAnalytics();
    }, [loadAnalytics]);

    const handleExportSummary = () => {
        const csvRows = [
            ['Metric', 'Value'],
            ['7-Day Retention', `${analytics?.retention_7d_pct ?? 0}%`],
            ['Avg Session', analytics?.avg_session_label ?? '—'],
            ['Goal Completion', `${analytics?.goal_completion_pct ?? 0}%`],
            ['Ksh Logs / Week', String(analytics?.ksh_logs_per_week ?? 0)],
        ];
        const blob = new Blob([csvRows.map((r) => r.join(',')).join('\n')], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'hexad-admin-analytics.csv';
        link.click();
        URL.revokeObjectURL(url);
        setStatusMessage('Exported hexad-admin-analytics.csv');
    };

    const dailyBars = analytics?.daily_volume ?? [];
    const topSubViews = analytics?.top_sub_views ?? [];

    return (
        <AdminShell
            subtitle="Track retention cohorts, weekly check-in volume, and top sub-views."
            ctaLabel="Export summary"
            ctaIcon={<Download className="h-3.5 w-3.5" />}
            onCtaClick={handleExportSummary}
            statusMessage={statusMessage}
        >
            {loading ? (
                <div className="mt-14 flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-[#004635]" />
                </div>
            ) : (
                <>
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">7-Day Retention</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#004635]">
                                {analytics?.retention_7d_pct ?? 0}%
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                {analytics?.retention_delta_label ?? 'No cohort data'}
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Avg Session</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {analytics?.avg_session_label ?? '—'}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Focused daily check-in</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Goal Completion</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {analytics?.goal_completion_pct ?? 0}%
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Completed goals ratio</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Ksh Logs / Week</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#006A4E]">
                                {(analytics?.ksh_logs_per_week ?? 0).toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Weekly financial logs</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Daily Check-in Volume
                            </h2>
                            <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                                <div className="flex h-44 items-end justify-between gap-3 pt-4">
                                    {dailyBars.map((bar) => (
                                        <div
                                            key={bar.day}
                                            className="flex flex-1 flex-col items-center gap-2 h-full justify-end"
                                        >
                                            <div
                                                className="w-full rounded-t-md"
                                                style={{
                                                    height: `${bar.value_pct}%`,
                                                    backgroundColor: bar.muted ? '#2D6A56' : '#064E3B',
                                                }}
                                            />
                                            <span className="text-[11px] text-[#707974]">{bar.day}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-4 text-xs text-[#707974]">
                                    Live daily completed habit/check-in volume over the past 7 days.
                                </p>
                            </div>
                        </div>

                        <div className="lg:col-span-5">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Top Sub-Views
                            </h2>
                            <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                {topSubViews.length === 0 ? (
                                    <p className="p-4 text-xs text-[#707974]">No sub-view telemetry recorded yet.</p>
                                ) : (
                                    topSubViews.map((item) => (
                                        <div
                                            key={item.rank}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {item.title}
                                                </div>
                                                <div className="text-xs text-[#707974] mt-0.5 truncate">
                                                    {item.meta}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#004635] shrink-0">
                                                #{item.rank}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </AdminShell>
    );
}