'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { AcademicsShell } from '@/components/academics/AcademicsShell';
import { useAuth } from '@/context/AuthContext';
import {
    AcademicsSummary,
    academicsApi,
    CourseItem,
    ExamPrepSessionItem,
} from '@/lib/academics-api';
import { PillarGoal } from '@/types/api';

type ExamPrepCache = {
    summary: AcademicsSummary | null;
    courses: CourseItem[];
    sessions: ExamPrepSessionItem[];
    goals: PillarGoal[];
};

const CACHE_TTL_MS = 10 * 60 * 1000;

function getCacheKey(userId?: string | number | null): string | null {
    if (!userId) return null;
    return `hexad:academics:exam-prep:${userId}`;
}

function readCache(key: string | null): ExamPrepCache | null {
    if (!key || typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { data?: ExamPrepCache; savedAt?: number };
        if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
            return null;
        }
        return parsed.data ?? null;
    } catch {
        return null;
    }
}

function writeCache(key: string | null, data: ExamPrepCache): void {
    if (!key || typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }));
    } catch {
        // Ignore storage quota or private-mode errors
    }
}

function formatDurationHm(totalMins: number): string {
    const safe = Math.max(0, Math.round(totalMins));
    const hrs = Math.floor(safe / 60);
    const mins = safe % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
}

export default function ExamPrepPage() {
    const { user } = useAuth();
    const userId = user?.id;
    const cacheKey = getCacheKey(userId);
    const initialCache = readCache(cacheKey);

    const [summary, setSummary] = useState<AcademicsSummary | null>(() => initialCache?.summary ?? null);
    const [courses, setCourses] = useState<CourseItem[]>(() => initialCache?.courses ?? []);
    const [sessions, setSessions] = useState<ExamPrepSessionItem[]>(() => initialCache?.sessions ?? []);
    const [goals, setGoals] = useState<PillarGoal[]>(() => initialCache?.goals ?? []);

    const hasCachedData = Boolean(
        initialCache &&
        (initialCache.summary ||
            initialCache.courses.length > 0 ||
            initialCache.sessions.length > 0 ||
            initialCache.goals.length > 0)
    );

    const [loading, setLoading] = useState<boolean>(() => !hasCachedData);
    const [error, setError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [courseId, setCourseId] = useState<string>(() =>
        initialCache?.courses?.[0] ? String(initialCache.courses[0].id) : ''
    );
    const [topic, setTopic] = useState('');
    const [durationMins, setDurationMins] = useState('60');
    const [mockScorePct, setMockScorePct] = useState('');
    const [sessionDate, setSessionDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!userId) return;
        const activeKey = getCacheKey(userId);
        const cached = readCache(activeKey);

        if (cached) {
            setSummary((prev) => prev ?? cached.summary ?? null);
            setCourses((prev) => (prev.length > 0 ? prev : cached.courses ?? []));
            setSessions((prev) => (prev.length > 0 ? prev : cached.sessions ?? []));
            setGoals((prev) => (prev.length > 0 ? prev : cached.goals ?? []));
            if (cached.courses?.[0]) {
                setCourseId((prev) => prev || String(cached.courses[0].id));
            }
        }

        const hasAnyExistingData = Boolean(
            cached &&
            (cached.summary ||
                cached.courses.length > 0 ||
                cached.sessions.length > 0 ||
                cached.goals.length > 0)
        );
        if (!hasAnyExistingData) {
            setLoading(true);
        }
        setError(null);

        try {
            const [sumRes, coursesRes, sessRes, goalsRes] = await Promise.all([
                academicsApi.getSummary().catch(() => null),
                academicsApi.getCourses().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                academicsApi.getExamPrepSessions().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                academicsApi.getAcademicGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);

            const nextCourses = Array.isArray(coursesRes.results) ? coursesRes.results : [];
            const nextSessions = Array.isArray(sessRes.results) ? sessRes.results : [];
            const nextGoals = Array.isArray(goalsRes.results) ? goalsRes.results : [];

            setSummary(sumRes);
            setCourses(nextCourses);
            setSessions(nextSessions);
            setGoals(nextGoals);

            if (nextCourses.length > 0) {
                setCourseId((prev) => prev || String(nextCourses[0].id));
            }

            writeCache(activeKey, {
                summary: sumRes,
                courses: nextCourses,
                sessions: nextSessions,
                goals: nextGoals,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load exam prep.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const totalSessionMins = useMemo(
        () => sessions.reduce((acc, s) => acc + (Number(s.duration_mins) || 0), 0),
        [sessions]
    );

    const avgMockScore = useMemo(() => {
        const scored = sessions.filter(
            (s) => s.mock_score_pct !== null && s.mock_score_pct !== undefined
        );
        if (scored.length === 0) return '0%';
        const avg =
            scored.reduce((a, b) => a + Number(b.mock_score_pct || 0), 0) / scored.length;
        return `${avg.toFixed(1)}%`;
    }, [sessions]);

    const handleCreateMock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;
        if (!courseId) {
            setError('Please select a course before starting a mock test.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await academicsApi.createExamPrepSession({
                course: Number(courseId),
                topic: topic.trim(),
                duration_mins: Math.max(1, Number(durationMins) || 60),
                mock_score_pct: mockScorePct ? Number(mockScorePct) : null,
                session_date: sessionDate || new Date().toISOString().slice(0, 10),
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save mock test.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AcademicsShell
            subtitle="Exam countdowns, topic readiness, timed mock tests, and flashcard decks."
            ctaLabel="Start mock test"
            onCtaClick={() => {
                setCourseId((prev) => prev || (courses[0] ? String(courses[0].id) : ''));
                setTopic('');
                setDurationMins('60');
                setMockScorePct('');
                setSessionDate(new Date().toISOString().slice(0, 10));
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
                            <div className="text-xs text-[#707974]">Prep Time Logged</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#00629F]">
                                {formatDurationHm(summary?.total_exam_prep_mins ?? totalSessionMins)}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Total focused revision</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Avg Mock Score</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {avgMockScore}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Across timed sessions</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Prep Sessions</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {sessions.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Completed study blocks</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Active Milestones</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.filter((g) => g.status === 'active').length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Exam readiness targets</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Exam Readiness
                            </h2>
                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No exam readiness milestones set yet.
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {goals.map((goal) => {
                                        const target = Number(goal.target_value) || 100;
                                        const current = Number(goal.current_value) || 0;
                                        const pct = Math.min(100, Math.max(0, Math.round((current / target) * 100)));
                                        return (
                                            <div
                                                key={goal.id}
                                                className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-[#14221C]">
                                                            {goal.title}
                                                        </div>
                                                        <div className="font-mono text-xs text-[#707974] mt-0.5">
                                                            {goal.current_value} / {goal.target_value} {goal.unit}
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-xs font-semibold text-[#00629F]">
                                                        {pct}% ready
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
                                Mock Tests &amp; Decks
                            </h2>
                            {sessions.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No mock tests logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {sessions.slice(0, 6).map((s) => (
                                        <div
                                            key={s.id}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {s.topic}
                                                </div>
                                                <div className="font-mono text-[11px] text-[#707974] mt-0.5">
                                                    {s.session_date} · {formatDurationHm(s.duration_mins)}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#00629F] shrink-0">
                                                {s.mock_score_pct !== null && s.mock_score_pct !== undefined
                                                    ? `${s.mock_score_pct}%`
                                                    : 'Completed'}
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
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Start mock test
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
                                    You need at least one course before logging an exam prep session. Create a course on the Coursework page first.
                                </p>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateMock} className="space-y-4">
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
                                        Exam / Mock Topic
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-[#14221C] mb-1">
                                            Duration (mins)
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            required
                                            value={durationMins}
                                            onChange={(e) => setDurationMins(e.target.value)}
                                            className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[#14221C] mb-1">
                                            Mock Score (%)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={mockScorePct}
                                            onChange={(e) => setMockScorePct(e.target.value)}
                                            className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Session Date
                                    </label>
                                    <input
                                        type="date"
                                        value={sessionDate}
                                        onChange={(e) => setSessionDate(e.target.value)}
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