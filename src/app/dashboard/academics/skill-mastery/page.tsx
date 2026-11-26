'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { AcademicsShell } from '@/components/academics/AcademicsShell';
import { useAuth } from '@/context/AuthContext';
import {
    AcademicsSummary,
    academicsApi,
    ExamPrepSessionItem,
    SkillTrackItem,
} from '@/lib/academics-api';

type SkillMasteryCache = {
    summary: AcademicsSummary | null;
    skillTracks: SkillTrackItem[];
    sessions: ExamPrepSessionItem[];
};

const CACHE_TTL_MS = 10 * 60 * 1000;

function getCacheKey(userId?: string | number | null): string | null {
    if (!userId) return null;
    return `hexad:academics:skill-mastery:${userId}`;
}

function readCache(key: string | null): SkillMasteryCache | null {
    if (!key || typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { data?: SkillMasteryCache; savedAt?: number };
        if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
            return null;
        }
        return parsed.data ?? null;
    } catch {
        return null;
    }
}

function writeCache(key: string | null, data: SkillMasteryCache): void {
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

export default function SkillMasteryPage() {
    const { user } = useAuth();
    const userId = user?.id;
    const cacheKey = getCacheKey(userId);
    const initialCache = readCache(cacheKey);

    const [summary, setSummary] = useState<AcademicsSummary | null>(
        () => initialCache?.summary ?? null
    );
    const [skillTracks, setSkillTracks] = useState<SkillTrackItem[]>(
        () => initialCache?.skillTracks ?? []
    );
    const [sessions, setSessions] = useState<ExamPrepSessionItem[]>(
        () => initialCache?.sessions ?? []
    );

    const hasCachedData = Boolean(
        initialCache &&
        (initialCache.summary ||
            initialCache.skillTracks.length > 0 ||
            initialCache.sessions.length > 0)
    );

    const [loading, setLoading] = useState<boolean>(() => !hasCachedData);
    const [error, setError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [skillName, setSkillName] = useState('');
    const [proficiencyPct, setProficiencyPct] = useState('50');
    const [practiceHours, setPracticeHours] = useState('1');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!userId) return;
        const activeKey = getCacheKey(userId);
        const cached = readCache(activeKey);

        if (cached) {
            setSummary((prev) => prev ?? cached.summary ?? null);
            setSkillTracks((prev) => (prev.length > 0 ? prev : cached.skillTracks ?? []));
            setSessions((prev) => (prev.length > 0 ? prev : cached.sessions ?? []));
        }

        const hasAnyExistingData = Boolean(
            cached &&
            (cached.summary ||
                cached.skillTracks.length > 0 ||
                cached.sessions.length > 0)
        );
        if (!hasAnyExistingData) {
            setLoading(true);
        }
        setError(null);

        try {
            const [sumRes, skillsRes, sessRes] = await Promise.all([
                academicsApi.getSummary().catch(() => null),
                academicsApi.getSkillTracks().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                academicsApi.getExamPrepSessions().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);

            const nextSkillTracks = Array.isArray(skillsRes.results) ? skillsRes.results : [];
            const nextSessions = Array.isArray(sessRes.results) ? sessRes.results : [];

            setSummary(sumRes);
            setSkillTracks(nextSkillTracks);
            setSessions(nextSessions);

            writeCache(activeKey, {
                summary: sumRes,
                skillTracks: nextSkillTracks,
                sessions: nextSessions,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load skill mastery.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleCreateSkill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!skillName.trim()) return;
        setSubmitting(true);
        try {
            await academicsApi.createSkillTrack({
                skill_name: skillName.trim(),
                proficiency_pct: Math.min(100, Math.max(0, Number(proficiencyPct) || 0)),
                practice_hours: Math.max(0, Number(practiceHours) || 0),
                last_practiced_at: new Date().toISOString(),
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save skill track.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AcademicsShell
            subtitle="Competency tracks, benchmark problem sets, and practice checkpoints."
            ctaLabel="Log practice drill"
            onCtaClick={() => {
                setSkillName('');
                setProficiencyPct('50');
                setPracticeHours('1');
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
                            <div className="text-xs text-[#707974]">Active Tracks</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#00629F]">
                                {skillTracks.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Skill tracks monitored</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Practice Hours</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {summary?.total_skill_practice_hours ?? 0}h
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Cumulative skill practice</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Top Competency</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {skillTracks[0] ? `${skillTracks[0].proficiency_pct}%` : '0%'}
                            </div>
                            <div className="mt-1 text-xs text-[#707974] truncate">
                                {skillTracks[0]?.skill_name || 'No track yet'}
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Avg Mastery</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {skillTracks.length > 0
                                    ? `${Math.round(
                                        skillTracks.reduce((a, s) => a + (Number(s.proficiency_pct) || 0), 0) /
                                        skillTracks.length
                                    )}%`
                                    : '0%'}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Across all skill tracks</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Skill Mastery Tracks
                            </h2>
                            {skillTracks.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No skill tracks yet.
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {skillTracks.map((track) => {
                                        const pct = Math.min(100, Math.max(0, Number(track.proficiency_pct) || 0));
                                        return (
                                            <div
                                                key={track.id}
                                                className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-[#14221C]">
                                                            {track.skill_name}
                                                        </div>
                                                        <div className="font-mono text-xs text-[#707974] mt-0.5">
                                                            {track.practice_hours}h practiced
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-xs font-semibold text-[#00629F]">
                                                        {pct}%
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
                                Recent Checkpoints
                            </h2>
                            {sessions.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No practice checkpoints recorded yet.
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
                                                    : 'Logged'}
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
                                Log practice drill
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSkill} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Skill Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={skillName}
                                    onChange={(e) => setSkillName(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Proficiency (%)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={proficiencyPct}
                                        onChange={(e) => setProficiencyPct(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Practice Hours
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={practiceHours}
                                        onChange={(e) => setPracticeHours(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
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