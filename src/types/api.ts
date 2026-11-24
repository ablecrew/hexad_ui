export type PillarSlug =
    | 'academics'
    | 'emotional'
    | 'spiritual'
    | 'mental'
    | 'physical'
    | 'financial';

export interface UserProfile {
    id: number | string;
    email: string;
    full_name: string;
    auth_provider: 'email' | 'google' | 'apple';
    initials?: string;
    timezone?: string;
    role?: string | null;
    is_staff?: boolean;
    is_superuser?: boolean;
    is_admin?: boolean;
}

export interface AuthResponse {
    access: string;
    refresh: string;
    user: UserProfile;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface UserPillarFocus {
    id: number;
    pillar_slug: PillarSlug;
    is_active: boolean;
    target_weight?: string | number;
}

export interface UserStreak {
    id: number;
    current_streak_days: number;
    longest_streak_days: number;
    last_checkin_date: string | null;
}

export interface PillarGoal {
    id: number;
    pillar_slug: PillarSlug;
    subtab_slug?: string;
    title: string;
    cadence: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    target_value: string;
    current_value: string;
    unit: string;
    status: 'active' | 'completed' | 'paused';
    due_date: string | null;
}

export interface DailyHabit {
    id: number;
    pillar_slug: PillarSlug;
    title: string;
    scheduled_time: string | null;
    is_active: boolean;
}

export interface HabitLog {
    id: number;
    habit: number;
    log_date: string;
    completed: boolean;
    completed_at: string | null;
}

export interface WeeklySnapshot {
    id: number;
    week_start_date: string;
    pillar_slug: PillarSlug;
    score_pct: number;
    checkins_count: number;
    streak_days: number;
}