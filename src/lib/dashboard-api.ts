import { apiFetch } from '@/lib/api-client';
import {
    DailyHabit,
    HabitLog,
    PaginatedResponse,
    PillarGoal,
    PillarSlug,
    UserPillarFocus,
    UserStreak,
    WeeklySnapshot,
} from '@/types/api';

export interface PillarCheckin {
    id: number;
    pillar_slug: PillarSlug;
    subtab_slug?: string;
    goal?: number | null;
    title: string;
    note?: string;
    metric_label?: string;
    created_at?: string;
    logged_at?: string | null;
}

export interface FinancialSummary {
    total_assets_ksh: string;
    total_debts_ksh: string;
    net_worth_ksh: string;
    monthly_income_ksh: string;
    monthly_expenses_ksh: string;
}

export interface AcademicsSummary {
    average_grade_pct: number | null;
    pending_assignments_count: number;
    total_exam_prep_mins: number;
    total_skill_practice_hours: string | number;
}

export interface EmotionalSummary {
    average_mood_score: number | null;
    journal_entries_count: number;
    active_boundaries_count: number;
}

export interface SpiritualSummary {
    total_breath_mins: number;
    gratitude_entries_count: number;
    values_count: number;
}

export interface MentalSummary {
    total_detox_mins: number;
    cognitive_notes_count: number;
}

export interface PhysicalSummary {
    average_sleep_hrs: number | null;
    total_steps: number;
    workouts_count: number;
    average_energy_level: number | null;
}

export const coreApi = {
    getFocuses: () =>
        apiFetch<PaginatedResponse<UserPillarFocus>>('/core/focuses/'),
    setPillarFocuses: (
        focuses: { pillar_slug: PillarSlug; is_active: boolean; target_weight: number }[]
    ) =>
        apiFetch<UserPillarFocus[]>('/core/focuses/bulk_set/', {
            method: 'POST',
            body: JSON.stringify({ focuses }),
        }),

    getStreaks: () =>
        apiFetch<PaginatedResponse<UserStreak>>('/core/streaks/'),
    getSnapshots: (weekStart?: string) =>
        apiFetch<PaginatedResponse<WeeklySnapshot>>(
            weekStart
                ? `/core/snapshots/?week_start_date=${weekStart}`
                : '/core/weekly-snapshots/?ordering=-week_start_date'
        ),

    getGoals: (pillarSlug?: PillarSlug) =>
        apiFetch<PaginatedResponse<PillarGoal>>(
            pillarSlug ? `/core/goals/?pillar_slug=${pillarSlug}` : '/core/goals/'
        ),
    createGoal: (payload: {
        pillar_slug: PillarSlug;
        subtab_slug?: string;
        title: string;
        cadence: 'daily' | 'weekly' | 'monthly' | 'quarterly';
        target_value: number;
        current_value?: number;
        unit?: string;
        due_date?: string | null;
    }) =>
        apiFetch<PillarGoal>('/core/goals/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    patchGoal: (
        id: number,
        payload: Partial<{
            title: string;
            cadence: 'daily' | 'weekly' | 'monthly' | 'quarterly';
            target_value: number;
            current_value: number;
            unit: string;
            status: string;
            due_date: string | null;
        }>
    ) =>
        apiFetch<PillarGoal>(`/core/goals/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        }),

    getHabits: () =>
        apiFetch<PaginatedResponse<DailyHabit>>('/core/habits/?is_active=true'),
    getHabitLogsByDate: (logDate: string) =>
        apiFetch<PaginatedResponse<HabitLog>>(`/core/habit-logs/?log_date=${logDate}`),
    createHabitLog: (payload: {
        habit: number;
        log_date: string;
        completed: boolean;
        completed_at?: string;
    }) =>
        apiFetch<HabitLog>('/core/habit-logs/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    patchHabitLog: (
        id: number,
        payload: { completed: boolean; completed_at?: string | null }
    ) =>
        apiFetch<HabitLog>(`/core/habit-logs/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        }),

    getCheckins: (pillarSlug?: PillarSlug) =>
        apiFetch<PaginatedResponse<PillarCheckin>>(
            pillarSlug
                ? `/core/checkins/?pillar_slug=${pillarSlug}&ordering=-created_at`
                : '/core/checkins/?ordering=-created_at'
        ),
    createCheckin: (payload: {
        pillar_slug: PillarSlug;
        subtab_slug?: string;
        goal?: number | null;
        title: string;
        note?: string;
        metric_label?: string;
    }) =>
        apiFetch<PillarCheckin>('/core/checkins/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    createHabit: (payload: {
        title: string;
        pillar_slug: PillarSlug;
        scheduled_time?: string;
    }) =>
        apiFetch<DailyHabit>('/core/habits/', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
};

export const pillarSummariesApi = {
    financial: () => apiFetch<FinancialSummary>('/financial/summary/'),
    academics: () => apiFetch<AcademicsSummary>('/academics/summary/'),
    emotional: () => apiFetch<EmotionalSummary>('/emotional/summary/'),
    spiritual: () => apiFetch<SpiritualSummary>('/spiritual/summary/'),
    mental: () => apiFetch<MentalSummary>('/mental/summary/'),
    physical: () => apiFetch<PhysicalSummary>('/physical/summary/'),
};