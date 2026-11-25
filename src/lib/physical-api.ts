import { apiFetch } from '@/lib/api-client';
import { PhysicalSummary } from '@/lib/dashboard-api';
import { PaginatedResponse, PillarGoal } from '@/types/api';

export interface PhysicalLogItem {
    id: number;
    title: string;
    metric_label?: string;
    duration_mins?: number;
    note?: string;
    created_at?: string | null;
    logged_at?: string | null;
    date?: string | null;
}

const EMPTY_PAGINATED_GOALS: PaginatedResponse<PillarGoal> = {
    count: 0,
    next: null,
    previous: null,
    results: [],
};

export const physicalApi = {
    getSummary: () => apiFetch<PhysicalSummary>('/physical/summary/'),

    getWorkouts: () =>
        apiFetch<PaginatedResponse<PhysicalLogItem>>(
            '/physical/workouts/?ordering=-id'
        ).catch(() => ({ count: 0, next: null, previous: null, results: [] })),

    createWorkout: (payload: {
        title: string;
        duration_mins: number;
        note?: string;
    }) =>
        apiFetch<PhysicalLogItem>('/physical/workouts/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getSleepLogs: () =>
        apiFetch<PaginatedResponse<PhysicalLogItem>>(
            '/physical/sleep-logs/?ordering=-id'
        ).catch(() => ({ count: 0, next: null, previous: null, results: [] })),

    createSleepLog: (payload: {
        title: string;
        metric_label?: string;
        note?: string;
    }) =>
        apiFetch<PhysicalLogItem>('/physical/sleep-logs/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getPhysicalGoals: (subtabSlug?: string) => {
        const query = subtabSlug
            ? `/core/goals/?pillar_slug=physical&subtab_slug=${encodeURIComponent(subtabSlug)}`
            : '/core/goals/?pillar_slug=physical';
        return apiFetch<PaginatedResponse<PillarGoal>>(query).catch(
            () => EMPTY_PAGINATED_GOALS
        );
    },
};