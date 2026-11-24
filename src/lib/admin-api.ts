import { apiFetch } from '@/lib/api-client';
import { PaginatedResponse, PillarSlug } from '@/types/api';

export interface AdminOverviewStats {
    total_members: number;
    new_members_this_week: number;
    daily_active: number;
    dau_mau_pct: number;
    weekly_checkins: number;
    avg_pillar_score: number;
    pillar_engagement: Array<{
        pillar_slug: PillarSlug;
        label: string;
        score_pct: number;
        bar_color: string;
    }>;
    recent_activity: Array<{
        id: string | number;
        title: string;
        subtitle: string;
        time_label: string;
    }>;
}

export interface AdminMemberRecord {
    id: string | number;
    full_name: string;
    email: string;
    initials: string;
    role: 'Admin' | 'Member' | string;
    streak_days: number;
    balance_pct: number;
    status: 'Active' | 'Pending' | string;
}

export interface AdminUsersResponse extends PaginatedResponse<AdminMemberRecord> {
    summary?: {
        total_users: number;
        new_this_week: number;
        verified_pct: number;
        needs_review: number;
    };
}

export interface AdminAnalyticsStats {
    retention_7d_pct: number;
    retention_delta_label: string;
    avg_session_label: string;
    goal_completion_pct: number;
    ksh_logs_per_week: number;
    daily_volume: Array<{
        day: string;
        value_pct: number;
        muted?: boolean;
    }>;
    top_sub_views: Array<{
        rank: number;
        title: string;
        meta: string;
    }>;
}

export interface AdminPlatformSettings {
    app_name: string;
    default_currency: 'KSH' | 'USD' | 'EUR';
    weekly_digest_day: string;
    daily_checkin_reminders: boolean;
    public_landing_preview: boolean;
    self_serve_signup: boolean;
}

export const adminApi = {
    getOverview: () => apiFetch<AdminOverviewStats>('/admin/overview/'),

    getMembers: (query = '') =>
        apiFetch<AdminUsersResponse>(
            `/admin/users/${query ? `?q=${encodeURIComponent(query)}` : ''}`
        ),

    inviteMember: (payload: { email: string; full_name: string; role: string }) =>
        apiFetch('/admin/users/invite/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getAnalytics: () => apiFetch<AdminAnalyticsStats>('/admin/analytics/'),

    getSettings: () => apiFetch<AdminPlatformSettings>('/admin/settings/'),

    saveSettings: (payload: AdminPlatformSettings) =>
        apiFetch<AdminPlatformSettings>('/admin/settings/', {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
};