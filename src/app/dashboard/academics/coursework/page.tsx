'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { AcademicsShell } from '@/components/academics/AcademicsShell';
import { useAuth } from '@/context/AuthContext';
import {
    AcademicsSummary,
    academicsApi,
    AssignmentItem,
    CourseItem,
} from '@/lib/academics-api';

type CourseworkCache = {
    summary: AcademicsSummary | null;
    courses: CourseItem[];
    assignments: AssignmentItem[];
};

const CACHE_TTL_MS = 10 * 60 * 1000;

function getCacheKey(userId?: string | number | null): string | null {
    if (!userId) return null;
    return `hexad:academics:coursework:${userId}`;
}

function readCache(key: string | null): CourseworkCache | null {
    if (!key || typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { data?: CourseworkCache; savedAt?: number };
        if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
            return null;
        }
        return parsed.data ?? null;
    } catch {
        return null;
    }
}

function writeCache(key: string | null, data: CourseworkCache): void {
    if (!key || typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }));
    } catch {
        // Ignore storage quota or private-mode errors
    }
}

function formatGradeLetter(pct: number | null): string {
    if (pct === null || Number.isNaN(pct)) return '—';
    if (pct >= 93) return 'A';
    if (pct >= 90) return 'A-';
    if (pct >= 87) return 'B+';
    if (pct >= 83) return 'B';
    if (pct >= 80) return 'B-';
    if (pct >= 77) return 'C+';
    if (pct >= 73) return 'C';
    if (pct >= 70) return 'C-';
    if (pct >= 60) return 'D';
    return 'F';
}

function formatGpaFromPct(pct: number | null): string {
    if (pct === null || Number.isNaN(pct)) return '0.00';
    return Math.min(4, Math.max(0, (pct / 100) * 4)).toFixed(2);
}

export default function CourseworkPage() {
    const { user } = useAuth();
    const userId = user?.id;
    const cacheKey = getCacheKey(userId);
    const initialCache = readCache(cacheKey);

    const [summary, setSummary] = useState<AcademicsSummary | null>(() => initialCache?.summary ?? null);
    const [courses, setCourses] = useState<CourseItem[]>(() => initialCache?.courses ?? []);
    const [assignments, setAssignments] = useState<AssignmentItem[]>(() => initialCache?.assignments ?? []);

    const hasCachedData = Boolean(
        initialCache &&
        (initialCache.summary ||
            initialCache.courses.length > 0 ||
            initialCache.assignments.length > 0)
    );

    const [loading, setLoading] = useState<boolean>(() => !hasCachedData);
    const [error, setError] = useState<string | null>(null);

    // Add Course modal state
    const [courseModalOpen, setCourseModalOpen] = useState(false);
    const [courseCode, setCourseCode] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [courseCredits, setCourseCredits] = useState('3');
    const [courseTerm, setCourseTerm] = useState('');
    const [courseGradePct, setCourseGradePct] = useState('');
    const [courseSubmitting, setCourseSubmitting] = useState(false);

    // Add Assignment modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [courseId, setCourseId] = useState<string>(() =>
        initialCache?.courses?.[0] ? String(initialCache.courses[0].id) : ''
    );
    const [title, setTitle] = useState('');
    const [weightPct, setWeightPct] = useState('');
    const [scorePct, setScorePct] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!userId) return;
        const activeKey = getCacheKey(userId);
        const cached = readCache(activeKey);

        if (cached) {
            setSummary((prev) => prev ?? cached.summary ?? null);
            setCourses((prev) => (prev.length > 0 ? prev : cached.courses ?? []));
            setAssignments((prev) => (prev.length > 0 ? prev : cached.assignments ?? []));
            if (cached.courses?.[0]) {
                setCourseId((prev) => prev || String(cached.courses[0].id));
            }
        }

        const hasAnyExistingData = Boolean(
            cached &&
            (cached.summary ||
                cached.courses.length > 0 ||
                cached.assignments.length > 0)
        );
        if (!hasAnyExistingData) {
            setLoading(true);
        }
        setError(null);

        try {
            const [sumRes, coursesRes, assignRes] = await Promise.all([
                academicsApi.getSummary().catch(() => null),
                academicsApi.getCourses().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                academicsApi.getAssignments().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);

            const nextCourses = Array.isArray(coursesRes.results) ? coursesRes.results : [];
            const nextAssignments = Array.isArray(assignRes.results) ? assignRes.results : [];

            setSummary(sumRes);
            setCourses(nextCourses);
            setAssignments(nextAssignments);

            if (nextCourses.length > 0) {
                setCourseId((prev) => prev || String(nextCourses[0].id));
            }

            writeCache(activeKey, {
                summary: sumRes,
                courses: nextCourses,
                assignments: nextAssignments,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load coursework.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const openCourseModal = () => {
        setCourseCode('');
        setCourseTitle('');
        setCourseCredits('3');
        setCourseTerm('');
        setCourseGradePct('');
        setCourseModalOpen(true);
    };

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseCode.trim() || !courseTitle.trim()) return;
        setCourseSubmitting(true);
        setError(null);
        try {
            const created = await academicsApi.createCourse({
                code: courseCode.trim(),
                title: courseTitle.trim(),
                credits: Math.max(0, Number(courseCredits) || 0),
                term: courseTerm.trim(),
                current_grade_pct: courseGradePct !== '' ? Number(courseGradePct) : null,
            });
            setCourseModalOpen(false);
            await loadData();
            if (created?.id !== undefined) {
                setCourseId(String(created.id));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save course.');
        } finally {
            setCourseSubmitting(false);
        }
    };

    const handleCreateAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        if (!courseId) {
            setError('Please select a course before adding an assignment.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await academicsApi.createAssignment({
                course: Number(courseId),
                title: title.trim(),
                weight_pct: weightPct ? Number(weightPct) : null,
                score_pct: scorePct ? Number(scorePct) : null,
                due_at: dueDate ? `${dueDate}T23:59:00Z` : null,
                status: scorePct ? 'graded' : 'in_progress',
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save assignment.');
        } finally {
            setSubmitting(false);
        }
    };

    const avgGrade = summary?.average_grade_pct ?? null;

    return (
        <AcademicsShell
            subtitle="Coursework standing, term GPA, graded assignments, and upcoming deadlines."
            ctaLabel="Add assignment"
            onCtaClick={() => {
                setCourseId((prev) => prev || (courses[0] ? String(courses[0].id) : ''));
                setTitle('');
                setWeightPct('');
                setScorePct('');
                setDueDate(new Date().toISOString().slice(0, 10));
                setModalOpen(true);
            }}
            error={error}
        >
            {loading ? (
                <div className="mt-14 flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-[#004635]" />
                </div>
            ) : (
                <>
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Term GPA</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#00629F]">
                                {formatGpaFromPct(avgGrade)}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                {courses.reduce((acc, c) => acc + (Number(c.credits) || 0), 0)} credits enrolled
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Graded Work</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {avgGrade !== null ? `${avgGrade}%` : '0%'}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                {assignments.length} assignments recorded
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Due This Week</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.pending_assignments_count ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Pending coursework items</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Active Courses</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {courses.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Enrolled terms</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between gap-2 mb-3.5">
                                <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                    Active Courses
                                </h2>
                                <button
                                    type="button"
                                    onClick={openCourseModal}
                                    className="inline-flex items-center gap-1 rounded-lg border border-[#BFC9C3] bg-white px-3 py-1.5 text-xs font-medium text-[#14221C] hover:bg-[#ECEEEB] transition"
                                >
                                    <Plus className="h-3.5 w-3.5 text-[#004635]" />
                                    Add course
                                </button>
                            </div>

                            {courses.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    <p>No courses found yet. Create a course first to start tracking coursework and assignments.</p>
                                    <button
                                        type="button"
                                        onClick={openCourseModal}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Create first course
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {courses.map((course) => {
                                        const gradeNum =
                                            course.current_grade_pct !== null &&
                                            course.current_grade_pct !== undefined
                                                ? Number(course.current_grade_pct)
                                                : null;
                                        const pct = gradeNum !== null ? Math.min(100, Math.max(0, gradeNum)) : 0;
                                        return (
                                            <div
                                                key={course.id}
                                                className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-[#14221C]">
                                                            {course.code} · {course.title}
                                                        </div>
                                                        <div className="text-xs text-[#707974] mt-0.5">
                                                            {course.credits} credits {course.term ? `· ${course.term}` : ''}
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-xs font-semibold text-[#00629F]">
                                                        {gradeNum !== null
                                                            ? `${gradeNum}% (${formatGradeLetter(gradeNum)})`
                                                            : '—'}
                                                    </span>
                                                </div>
                                                <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-[#ECEEEB]">
                                                    <div
                                                        className="h-full rounded-full bg-[#00629F]"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Deadlines &amp; Grades
                            </h2>
                            {assignments.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No assignments logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {assignments.slice(0, 6).map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {item.title}
                                                </div>
                                                <div className="font-mono text-[11px] text-[#707974] mt-0.5">
                                                    {item.course_code ? `${item.course_code} · ` : ''}
                                                    {item.due_at ? item.due_at.slice(0, 10) : item.status}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#00629F] shrink-0">
                                                {item.score_pct !== null && item.score_pct !== undefined
                                                    ? `${item.score_pct}%`
                                                    : item.weight_pct
                                                        ? `${item.weight_pct}% wt`
                                                        : item.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Add Course Modal */}
            {courseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add course
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCourseModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCourse} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Course Code
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={courseCode}
                                        onChange={(e) => setCourseCode(e.target.value)}
                                        placeholder="e.g., CS 301"
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Credits
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={20}
                                        step="0.5"
                                        required
                                        value={courseCredits}
                                        onChange={(e) => setCourseCredits(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Course Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={courseTitle}
                                    onChange={(e) => setCourseTitle(e.target.value)}
                                    placeholder="e.g., Distributed Systems"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Term (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={courseTerm}
                                        onChange={(e) => setCourseTerm(e.target.value)}
                                        placeholder="e.g., Fall 2026"
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Current Grade % (optional)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={courseGradePct}
                                        onChange={(e) => setCourseGradePct(e.target.value)}
                                        placeholder="e.g., 85"
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCourseModalOpen(false)}
                                    className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={courseSubmitting}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {courseSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save course
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Assignment Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add assignment
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        {courses.length === 0 ? (
                            <div className="space-y-4">
                                <p className="text-xs text-[#707974]">
                                    You need at least one course before adding an assignment.
                                </p>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModalOpen(false);
                                            openCourseModal();
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add course
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateAssignment} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Course
                                    </label>
                                    <select
                                        required
                                        value={courseId}
                                        onChange={(e) => setCourseId(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    >
                                        {courses.map((course) => (
                                            <option key={course.id} value={String(course.id)}>
                                                {course.code} · {course.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Assignment Title
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-[#14221C] mb-1">
                                            Weight (%)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={weightPct}
                                            onChange={(e) => setWeightPct(e.target.value)}
                                            className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[#14221C] mb-1">
                                            Score (%)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={scorePct}
                                            onChange={(e) => setScorePct(e.target.value)}
                                            className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
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
                                        Save
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </AcademicsShell>
    );
}