import { apiFetch } from '@/lib/api-client';
import { MentalSummary } from '@/lib/dashboard-api';
import { PaginatedResponse, PillarGoal } from '@/types/api';

export interface MentalLogItem {
    id: number;
    title: string;
    category?: string;
    duration_mins?: number;
    note?: string;
    created_at?: string;
}

const EMPTY_PAGINATED_GOALS: PaginatedResponse<PillarGoal> = {
    count: 0,
    next: null,
    previous: null,
    results: [],
};

export const mentalApi = {
    getSummary: () => apiFetch<MentalSummary>('/mental/summary/'),

    getDetoxLogs: () =>
        apiFetch<PaginatedResponse<MentalLogItem>>(
            '/mental/detox-logs/?ordering=-id'
        ).catch(() => ({ count: 0, next: null, previous: null, results: [] })),

    createDetoxLog: (payload: {
        title: string;
        duration_mins: number;
        note?: string;
    }) =>
        apiFetch<MentalLogItem>('/mental/detox-logs/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getCognitiveNotes: () =>
        apiFetch<PaginatedResponse<MentalLogItem>>(
            '/mental/notes/?ordering=-id'
        ).catch(() => ({ count: 0, next: null, previous: null, results: [] })),

    createCognitiveNote: (payload: {
        title: string;
        duration_mins?: number;
        note?: string;
    }) =>
        apiFetch<MentalLogItem>('/mental/notes/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getMentalGoals: (subtabSlug?: string) => {
        const query = subtabSlug
            ? `/core/goals/?pillar_slug=mental&subtab_slug=${encodeURIComponent(subtabSlug)}`
            : '/core/goals/?pillar_slug=mental';
        return apiFetch<PaginatedResponse<PillarGoal>>(query).catch(
            () => EMPTY_PAGINATED_GOALS
        );
    },
};