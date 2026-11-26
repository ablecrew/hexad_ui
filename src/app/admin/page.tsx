'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, UserPlus, X } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAuth } from '@/context/AuthContext';
import { adminApi, AdminOverviewStats } from '@/lib/admin-api';
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

function getAdminCacheKey(userId?: string | number | null): string | null {
    const resolvedId = userId ? String(userId) : getLastUserId();
    if (!resolvedId) return null;
    return `hexad:admin:overview:${resolvedId}`;
}

function readAdminCache(key: string | null): AdminOverviewStats | null {
    if (!key || typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as {
            data?: AdminOverviewStats;
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

function writeAdminCache(key: string | null, data: AdminOverviewStats): void {
    if (!key || typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }));
    } catch {
        // ignore storage errors
    }
}

export default function AdminOverviewPage() {
    const { user } = useAuth();
    const userId = user?.id;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [stats, setStats] = useState<AdminOverviewStats | null>(null);

    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteName, setInviteName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('Member');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (userId) {
            setLastUserId(userId);
        }
    }, [userId]);

    // Hydrate from localStorage after mount so SSR and initial client HTML match
    useEffect(() => {
        const cached = readAdminCache(getAdminCacheKey(userId));
        if (cached) {
            setStats((prev) => prev ?? cached);
            setLoading(false);
        }
    }, [userId]);

    const loadOverview = useCallback(async () => {
        if (!user || !isAdminUser(user)) return;
        const activeKey = getAdminCacheKey(user.id);
        const cached = readAdminCache(activeKey);

        if (cached) {
            setStats((prev) => prev ?? cached);
            setLoading(false);
        } else {
            setLoading(true);
        }

        setError(null);
        try {
            const res = await adminApi.getOverview();
            setStats(res);
            writeAdminCache(activeKey, res);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load admin overview.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadOverview();
    }, [loadOverview]);

    const handleInviteMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;
        setSubmitting(true);
        setStatusMessage(null);
        try {
            await adminApi.inviteMember({
                full_name: inviteName.trim() || inviteEmail.trim(),
                email: inviteEmail.trim(),
                role: inviteRole,
            });
            setInviteOpen(false);
            setStatusMessage(`Invitation sent to ${inviteEmail.trim()}.`);
            void loadOverview();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to send invite.');
        } finally {
            setSubmitting(false);
        }
    };

    const engagementRows = stats?.pillar_engagement ?? [];
    const activityRows = stats?.recent_activity ?? [];

    return (
        <AdminShell
            subtitle="Monitor member activity, six-pillar adoption, and platform health."
            ctaLabel="Invite member"
            ctaIcon={<UserPlus className="h-3.5 w-3.5" />}
            onCtaClick={() => {
                setInviteName('');
                setInviteEmail('');
                setInviteRole('Member');
                setInviteOpen(true);
            }}
            error={error}
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
                            <div className="text-xs text-[#707974]">Total Members</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#004635]">
                                {(stats?.total_members ?? 0).toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                +{stats?.new_members_this_week ?? 0} this week
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Daily Active</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {(stats?.daily_active ?? 0).toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                {stats?.dau_mau_pct ?? 0}% DAU / MAU
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Weekly Check-ins</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {(stats?.weekly_checkins ?? 0).toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Across 6 pillars</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Avg Pillar Score</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {stats?.avg_pillar_score ?? 0}%
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Live snapshot average</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Pillar Engagement
                            </h2>
                            <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5 space-y-4">
                                {engagementRows.length === 0 ? (
                                    <p className="text-xs text-[#707974]">No pillar engagement data yet.</p>
                                ) : (
                                    engagementRows.map((row) => (
                                        <div key={row.pillar_slug}>
                                            <div className="flex items-center justify-between text-xs mb-1.5">
                                                <span className="font-semibold text-[#14221C]">{row.label}</span>
                                                <span
                                                    className="font-mono font-semibold"
                                                    style={{ color: row.bar_color }}
                                                >
                                                    {row.score_pct}%
                                                </span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-[#ECEEEB]">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${Math.min(100, Math.max(0, row.score_pct))}%`,
                                                        backgroundColor: row.bar_color,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-5">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Recent Activity
                            </h2>
                            <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                {activityRows.length === 0 ? (
                                    <p className="p-4 text-xs text-[#707974]">No recent activity recorded yet.</p>
                                ) : (
                                    activityRows.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-start justify-between gap-3 px-4 py-3.5"
                                        >
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {item.title}
                                                </div>
                                                <div className="text-xs text-[#707974] mt-0.5 truncate">
                                                    {item.subtitle}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs text-[#707974] shrink-0">
                                                {item.time_label}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {inviteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Invite member
                            </h3>
                            <button
                                type="button"
                                onClick={() => setInviteOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleInviteMember} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Role
                                </label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                >
                                    <option value="Member">Member</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setInviteOpen(false)}
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
                                    Send invite
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminShell>
    );
}