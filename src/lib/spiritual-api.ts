import { apiFetch } from '@/lib/api-client';
import { SpiritualSummary } from '@/lib/dashboard-api';
import { PaginatedResponse, PillarGoal } from '@/types/api';

export function formatNairobiDateString(d: Date = new Date()): string {
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Africa/Nairobi',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(d);
        const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
        const month = parts.find((p) => p.type === 'month')?.value ?? '01';
        const day = parts.find((p) => p.type === 'day')?.value ?? '01';
        return `${year}-${month}-${day}`;
    } catch {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

export interface GratitudeEntryItem {
    id: number;
    entry_text?: string;
    title?: string;
    body?: string;
    note?: string;
    theme?: string;
    logged_date?: string;
    created_at?: string;
}
export interface CoreValueItem {
    id: number;
    title: string;
    description?: string;
    alignment_pct?: number;
    updated_at?: string;
}

export interface SacredReadingItem {
    id: number;
    title?: string;
    source?: string;
    passage?: string;
    reflection?: string;
    note?: string;
    created_at?: string;
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
            '/spiritual/gratitude-entries/?ordering=-created_at'
        ),
    createGratitudeEntry: (payload: {
        entry_text: string;
        logged_date: string;
        title?: string;
        body?: string;
        note?: string;
        theme?: string;
    }) =>
        apiFetch<GratitudeEntryItem>('/spiritual/gratitude-entries/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getValues: () =>
        apiFetch<PaginatedResponse<CoreValueItem>>('/spiritual/core-values/?ordering=-id'),
    createValue: (payload: {
        title: string;
        description?: string;
        alignment_pct?: number;
    }) =>
        apiFetch<CoreValueItem>('/spiritual/core-values/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getSacredReadings: () =>
        apiFetch<PaginatedResponse<SacredReadingItem>>(
            '/spiritual/sacred-readings/?ordering=-created_at'
        ),
    createSacredReading: (payload: {
        title?: string;
        source?: string;
        passage?: string;
        reflection?: string;
        note?: string;
    }) =>
        apiFetch<SacredReadingItem>('/spiritual/sacred-readings/', {
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

    createSpiritualGoal: (payload: {
        title: string;
        pillar_slug?: 'spiritual';
        cadence: string;
        target_value: number;
        current_value?: number;
        unit?: string;
    }) =>
        apiFetch<PillarGoal>('/core/goals/', {
            method: 'POST',
            body: JSON.stringify({
                pillar_slug: 'spiritual',
                current_value: 0,
                ...payload,
            }),
        }),

    getSpiritualGoals: () =>
        apiFetch<PaginatedResponse<PillarGoal>>('/core/goals/?pillar_slug=spiritual'),
};