import { apiFetch } from '@/lib/api-client';
import { PaginatedResponse, PillarGoal, WeeklySnapshot } from '@/types/api';

export interface AcademicsSummary {
    average_grade_pct: number | null;
    pending_assignments_count: number;
    total_exam_prep_mins: number;
    total_skill_practice_hours: string | number;
}

export interface CourseItem {
    id: number;
    code: string;
    title: string;
    credits: number;
    current_grade_pct: string | number | null;
    term: string;
}

export interface AssignmentItem {
    id: number;
    course: number | null;
    course_code?: string;
    title: string;
    due_at: string | null;
    weight_pct: string | number | null;
    score_pct: string | number | null;
    status: 'pending' | 'in_progress' | 'submitted' | 'graded' | string;
}

export interface ReadingItem {
    id: number;
    title: string;
    author: string;
    total_pages: number;
    pages_read: number;
    status: 'queued' | 'reading' | 'completed' | string;
}

export interface SkillTrackItem {
    id: number;
    skill_name: string;
    proficiency_pct: number;
    practice_hours: string | number;
    last_practiced_at: string | null;
}

export interface ExamPrepSessionItem {
    id: number;
    course: number | null;
    course_code?: string;
    topic: string;
    mock_score_pct: string | number | null;
    duration_mins: number;
    session_date: string;
}

export const academicsApi = {
    getSummary: () => apiFetch<AcademicsSummary>('/academics/summary/'),

    getSnapshots: (weekStart?: string) =>
        apiFetch<PaginatedResponse<WeeklySnapshot>>(
            weekStart
                ? `/core/weekly-snapshots/?week_start_date=${weekStart}`
                : '/core/weekly-snapshots/?ordering=-week_start_date'
        ),

    getCourses: () =>
        apiFetch<PaginatedResponse<CourseItem>>('/academics/courses/?ordering=-id'),

    createCourse: (payload: {
        code: string;
        title: string;
        credits: number;
        current_grade_pct?: number | null;
        term?: string;
    }) =>
        apiFetch<CourseItem>('/academics/courses/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getAssignments: () =>
        apiFetch<PaginatedResponse<AssignmentItem>>('/academics/assignments/?ordering=due_at'),

    createAssignment: (payload: {
        course?: number | null;
        title: string;
        due_at?: string | null;
        weight_pct?: number | null;
        score_pct?: number | null;
        status?: string;
    }) =>
        apiFetch<AssignmentItem>('/academics/assignments/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getReadingItems: () =>
        apiFetch<PaginatedResponse<ReadingItem>>('/academics/reading-items/?ordering=-id'),

    createReadingItem: (payload: {
        title: string;
        author: string;
        total_pages: number;
        pages_read: number;
        status: string;
    }) =>
        apiFetch<ReadingItem>('/academics/reading-items/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    patchReadingItem: (
        id: number,
        payload: Partial<{ pages_read: number; status: string }>
    ) =>
        apiFetch<ReadingItem>(`/academics/reading-items/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        }),

    getSkillTracks: () =>
        apiFetch<PaginatedResponse<SkillTrackItem>>('/academics/skill-tracks/?ordering=-proficiency_pct'),

    createSkillTrack: (payload: {
        skill_name: string;
        proficiency_pct: number;
        practice_hours: number;
        last_practiced_at?: string | null;
    }) =>
        apiFetch<SkillTrackItem>('/academics/skill-tracks/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getExamPrepSessions: () =>
        apiFetch<PaginatedResponse<ExamPrepSessionItem>>(
            '/academics/exam-prep-sessions/?ordering=-session_date'
        ),

    createExamPrepSession: (payload: {
        course?: number | null;
        topic: string;
        mock_score_pct?: number | null;
        duration_mins: number;
        session_date: string;
    }) =>
        apiFetch<ExamPrepSessionItem>('/academics/exam-prep-sessions/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getAcademicGoals: () =>
        apiFetch<PaginatedResponse<PillarGoal>>('/core/goals/?pillar_slug=academics'),
};