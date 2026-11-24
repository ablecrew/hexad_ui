// src/app/dashboard/academics/coursework/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { AcademicsShell } from '@/components/academics/AcademicsShell';
import { useAuth } from '@/context/AuthContext';
import {
    AcademicsSummary,
    academicsApi,
    AssignmentItem,
    CourseItem,
} from '@/lib/academics-api';

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<AcademicsSummary | null>(null);
    const [courses, setCourses] = useState<CourseItem[]>([]);
    const [assignments, setAssignments] = useState<AssignmentItem[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [weightPct, setWeightPct] = useState('');
    const [scorePct, setScorePct] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, coursesRes, assignRes] = await Promise.all([
                academicsApi.getSummary().catch(() => null),
                academicsApi.getCourses().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                academicsApi.getAssignments().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);
            setSummary(sumRes);
            setCourses(coursesRes.results);
            setAssignments(assignRes.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load coursework.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleCreateAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            await academicsApi.createAssignment({
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
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Active Courses
                            </h2>
                            {courses.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No courses found yet.
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

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
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
                        <form onSubmit={handleCreateAssignment} className="space-y-4">
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
                    </div>
                </div>
            )}
        </AcademicsShell>
    );
}