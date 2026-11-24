import { apiFetch } from '@/lib/api-client';
import { SpiritualSummary } from '@/lib/dashboard-api';
import { PaginatedResponse, PillarGoal } from '@/types/api';

export interface GratitudeEntryItem {
    id: number;
    title?: string;
    body?: string;
    note?: string;
    theme?: string;
    created_at: string;
}

export interface CoreValueItem {
    id: number;
    title: string;
    description?: string;
    alignment_pct?: number;
    updated_at?: string;
}

export interface BreathSessionItem {
    id: number;
    title?: string;
    cadence?: string;
    duration_mins?: number;
    calm_score?: number;
    created_at: string;
}

export const spiritualApi = {
    getSummary: () => apiFetch<SpiritualSummary>('/spiritual/summary/'),

    getGratitudeEntries: () =>
        apiFetch<PaginatedResponse<GratitudeEntryItem>>(
            '/spiritual/gratitude/?ordering=-created_at'
        ),
    createGratitudeEntry: (payload: {
        title: string;
        body?: string;
        theme?: string;
    }) =>
        apiFetch<GratitudeEntryItem>('/spiritual/gratitude/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getValues: () =>
        apiFetch<PaginatedResponse<CoreValueItem>>('/spiritual/values/?ordering=-id'),
    createValue: (payload: {
        title: string;
        description?: string;
        alignment_pct?: number;
    }) =>
        apiFetch<CoreValueItem>('/spiritual/values/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getBreathSessions: () =>
        apiFetch<PaginatedResponse<BreathSessionItem>>(
            '/spiritual/breath-sessions/?ordering=-created_at'
        ),
    createBreathSession: (payload: {
        title?: string;
        cadence?: string;
        duration_mins: number;
        calm_score?: number;
    }) =>
        apiFetch<BreathSessionItem>('/spiritual/breath-sessions/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getSpiritualGoals: () =>
        apiFetch<PaginatedResponse<PillarGoal>>('/core/goals/?pillar_slug=spiritual'),
};