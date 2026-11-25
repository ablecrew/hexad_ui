import { apiFetch } from '@/lib/api-client';
import { EmotionalSummary } from '@/lib/dashboard-api';
import { PaginatedResponse, PillarGoal } from '@/types/api';

export interface EmotionalLogItem {
    id?: number;
    title: string;
    body?: string;
    mood_label?: string;
    mood_score?: number;
    metric_label?: string;
    note?: string;
    created_at?: string;
    logged_at?: string;
    date?: string;
}

export const emotionalApi = {
    getSummary: () => apiFetch<EmotionalSummary>('/emotional/summary/'),

    getJournalEntries: () =>
        apiFetch<PaginatedResponse<EmotionalLogItem>>(
            '/emotional/journal-entries/?ordering=-id'
        ).catch(() => ({ count: 0, next: null, previous: null, results: [] })),

    createJournalEntry: (payload: {
        title: string;
        body: string;
        mood_label: string;
        mood_score: number;
        metric_label?: string;
        note?: string;
    }) =>
        apiFetch<EmotionalLogItem>('/emotional/journal-entries/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getBoundaries: () =>
        apiFetch<PaginatedResponse<EmotionalLogItem>>(
            '/emotional/boundaries/?ordering=-id'
        ).catch(() => ({ count: 0, next: null, previous: null, results: [] })),

    createBoundary: (payload: {
        title: string;
        metric_label?: string;
        note?: string;
    }) =>
        apiFetch<EmotionalLogItem>('/emotional/boundaries/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getEmotionalGoals: () =>
        apiFetch<PaginatedResponse<PillarGoal>>('/core/goals/?pillar_slug=emotional'),
};