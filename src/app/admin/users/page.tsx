'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, UserPlus, X } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAuth } from '@/context/AuthContext';
import { adminApi, AdminMemberRecord, AdminUsersResponse } from '@/lib/admin-api';
import { getUserAvatarPalette, isAdminUser } from '@/lib/rbac';

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

function getAdminUsersCacheKey(userId?: string | number | null): string | null {
    const resolvedId = userId ? String(userId) : getLastUserId();
    if (!resolvedId) return null;
    return `hexad:admin:users:${resolvedId}`;
}

function readAdminUsersCache(key: string | null): AdminUsersResponse | null {
    if (!key || typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as {
            data?: AdminUsersResponse;
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

function writeAdminUsersCache(key: string | null, data: AdminUsersResponse): void {
    if (!key || typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }));
    } catch {
        // ignore storage errors
    }
}

export default function AdminUsersPage() {
    const { user } = useAuth();
    const userId = user?.id;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [data, setData] = useState<AdminUsersResponse | null>(null);
    const [search, setSearch] = useState('');

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

    // Hydrate from localStorage after mount so SSR and initial client HTML stay aligned
    useEffect(() => {
        const cached = readAdminUsersCache(getAdminUsersCacheKey(userId));
        if (cached) {
            setData((prev) => prev ?? cached);
            setLoading(false);
        }
    }, [userId]);

    const loadMembers = useCallback(async () => {
        if (!user || !isAdminUser(user)) return;
        const activeKey = getAdminUsersCacheKey(user.id);
        const cached = readAdminUsersCache(activeKey);

        if (cached) {
            setData((prev) => prev ?? cached);
            setLoading(false);
        } else {
            setLoading(true);
        }

        setError(null);
        try {
            const res = await adminApi.getMembers();
            setData(res);
            writeAdminUsersCache(activeKey, res);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load members.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadMembers();
    }, [loadMembers]);

    const members: AdminMemberRecord[] = data?.results ?? [];

    const filteredMembers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return members;
        return members.filter(
            (m) =>
                m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
        );
    }, [members, search]);

    const handleInviteSubmit = async (e: React.FormEvent) => {
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
            void loadMembers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to send invite.');
        } finally {
            setSubmitting(false);
        }
    };

    const summary = data?.summary;

    return (
        <AdminShell
            subtitle="Manage member accounts, roles, streaks, and access status."
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
                            <div className="text-xs text-[#707974]">Total Users</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#004635]">
                                {(summary?.total_users ?? members.length).toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">All registered accounts</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">New This Week</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.new_this_week ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Registered in last 7 days</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Verified</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.verified_pct ?? 0}%
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Active accounts</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Needs Review</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#BA1A1A]">
                                {summary?.needs_review ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Inactive accounts</div>
                        </div>
                    </div>

                    <div className="mt-8 rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center mb-4">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                Member Directory
                            </h2>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Filter by name or email..."
                                className="w-full sm:w-64 rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-1.5 text-xs text-[#14221C]"
                            />
                        </div>

                        {filteredMembers.length === 0 ? (
                            <p className="py-8 text-center text-xs text-[#707974]">No members found.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                    <tr className="border-y border-[#ECEEEB] bg-[#F8FAF7] text-[10px] font-semibold tracking-wider text-[#707974] uppercase">
                                        <th className="py-2.5 px-3">Member</th>
                                        <th className="py-2.5 px-3">Role</th>
                                        <th className="py-2.5 px-3">Streak</th>
                                        <th className="py-2.5 px-3">Balance</th>
                                        <th className="py-2.5 px-3">Status</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ECEEEB] text-xs">
                                    {filteredMembers.map((m) => {
                                        const isActive = m.status === 'Active';
                                        const avatarStyle = getUserAvatarPalette(m.email || m.id);
                                        return (
                                            <tr key={m.id}>
                                                <td className="py-3.5 px-3">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                                                            style={{
                                                                backgroundColor: avatarStyle.bg,
                                                                color: avatarStyle.text,
                                                            }}
                                                        >
                                                            {m.initials}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-[#14221C]">
                                                                {m.full_name}
                                                            </div>
                                                            <div className="text-[11px] text-[#707974]">
                                                                {m.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3 font-medium text-[#14221C]">
                                                    {m.role}
                                                </td>
                                                <td className="py-3.5 px-3 font-mono text-[#2E312F]">
                                                    {m.streak_days} days
                                                </td>
                                                <td className="py-3.5 px-3 font-mono font-semibold text-[#004635]">
                                                    {m.balance_pct}%
                                                </td>
                                                <td className="py-3.5 px-3">
                                                        <span
                                                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                                                isActive
                                                                    ? 'bg-[#E6F2EC] text-[#004635]'
                                                                    : 'bg-[#ECEEEB] text-[#707974]'
                                                            }`}
                                                        >
                                                            {m.status}
                                                        </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        )}
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
                        <form onSubmit={handleInviteSubmit} className="space-y-4">
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