'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Flame,
  Hexagon,
} from 'lucide-react';
import { PILLARS } from '@/lib/pillars';
import { useAuth } from '@/context/AuthContext';
import { PillarSlug, UserStreak, WeeklySnapshot } from '@/types/api';

const LAST_USER_KEY = 'hexad:last_user_id';
const CACHE_TTL_MS = 10 * 60 * 1000;

const PREVIEW_SCORES: Record<string, { pct: number; bar: string }> = {
  academics: { pct: 88, bar: 'bg-[#2563EB]' },
  emotional: { pct: 79, bar: 'bg-[#C2410C]' },
  spiritual: { pct: 82, bar: 'bg-[#6D28D9]' },
  mental: { pct: 85, bar: 'bg-[#059669]' },
  physical: { pct: 86, bar: 'bg-[#B45309]' },
  financial: { pct: 92, bar: 'bg-[#084C36]' },
};

type CachedDashboardOverview = {
  streak?: UserStreak | null;
  snapshots?: WeeklySnapshot[];
};

function getLastUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LAST_USER_KEY);
  } catch {
    return null;
  }
}

function readCachedOverview(userId?: string | number | null): CachedDashboardOverview | null {
  if (typeof window === 'undefined') return null;
  const resolvedId = userId ? String(userId) : getLastUserId();
  if (!resolvedId) return null;
  try {
    const raw = window.localStorage.getItem(`hexad:dashboard:overview:${resolvedId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      data?: CachedDashboardOverview;
      savedAt?: number;
    };
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      return null;
    }
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export default function LandingPage() {
  const { user } = useAuth();
  const userId = user?.id;

  const [cachedSnapshots, setCachedSnapshots] = useState<WeeklySnapshot[]>([]);
  const [cachedStreakDays, setCachedStreakDays] = useState<number | null>(null);

  // Hydrate from localStorage after mount so SSR and initial client HTML stay aligned
  useEffect(() => {
    const cached = readCachedOverview(userId);
    if (!cached) return;

    if (Array.isArray(cached.snapshots) && cached.snapshots.length > 0) {
      setCachedSnapshots(cached.snapshots);
    }
    if (typeof cached.streak?.current_streak_days === 'number') {
      setCachedStreakDays(cached.streak.current_streak_days);
    }
  }, [userId]);

  const latestCachedScores = useMemo(() => {
    const map: Partial<Record<PillarSlug, number>> = {};
    for (const snap of cachedSnapshots) {
      if (map[snap.pillar_slug] === undefined) {
        map[snap.pillar_slug] = snap.score_pct;
      }
    }
    return map;
  }, [cachedSnapshots]);

  const snapshotLabel = user?.full_name ? `${user.full_name} Snapshot` : 'Hexad Snapshot';
  const snapshotBadge = user?.initials || 'HX';
  const streakLabel =
      typeof cachedStreakDays === 'number' ? `${cachedStreakDays}-day streak` : 'Daily streak';

  return (
      <div className="min-h-screen bg-[#F8F9F5] text-[#14221C]">
        {/* Top Nav */}
        <header className="sticky top-0 z-20 border-b border-[#E4E7DF] bg-[#F8F9F5]/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#084C36] text-white">
                <Hexagon className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-[#14221C]">Hexad</div>
                <div className="text-[11px] text-[#5C6962]">Personal Progress</div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-7 text-sm text-[#4A5750]">
              <a href="#six-pillars" className="hover:text-[#14221C] transition">
                Six Pillars
              </a>
              <a href="#weekly-rhythm" className="hover:text-[#14221C] transition">
                Weekly Rhythm
              </a>
              <Link href="/dashboard" prefetch className="hover:text-[#14221C] transition">
                Live Preview
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              {user ? (
                  <Link
                      href="/dashboard"
                      prefetch
                      className="rounded-lg bg-[#084C36] px-4 py-2 text-sm font-medium text-white hover:bg-[#063A29] transition"
                  >
                    Open dashboard
                  </Link>
              ) : (
                  <>
                    <Link
                        href="/login"
                        prefetch
                        className="px-3.5 py-2 text-sm font-medium text-[#14221C] hover:text-[#084C36] transition"
                    >
                      Sign in
                    </Link>
                    <Link
                        href="/signup"
                        prefetch
                        className="rounded-lg bg-[#084C36] px-4 py-2 text-sm font-medium text-white hover:bg-[#063A29] transition"
                    >
                      Get started
                    </Link>
                  </>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="border-b border-[#E4E7DF]">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:items-center lg:py-16">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#E6F2EC] px-3.5 py-1 text-xs font-medium text-[#084C36] mb-6">
                <Hexagon className="h-3.5 w-3.5" />
                Six-pillar personal operating system
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight leading-[1.08] text-[#111D18]">
                One calm place for all six pillars of your life.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-[#4E5B54]">
                Track Academics, Emotional clarity, Spiritual grounding, Mental focus,
                Physical energy, and Financial health in Ksh—without noisy feeds or
                fragmented apps.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3.5">
                <Link
                    href={user ? '/dashboard' : '/signup'}
                    prefetch
                    className="inline-flex items-center gap-2 rounded-lg bg-[#084C36] px-5 py-3 text-sm font-medium text-white hover:bg-[#063A29] transition"
                >
                  {user ? 'Go to dashboard' : 'Start tracking free'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                    href="/dashboard"
                    prefetch
                    className="inline-flex items-center justify-center rounded-lg border border-[#D4D9CE] bg-white px-5 py-3 text-sm font-medium text-[#14221C] hover:bg-[#F2F4EE] transition"
                >
                  Open dashboard
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-6 border-t border-[#E4E7DF] pt-6">
                <div>
                  <div className="font-serif text-2xl font-semibold text-[#111D18]">6</div>
                  <div className="text-xs text-[#5C6962] mt-0.5">Connected life pillars</div>
                </div>
                <div>
                  <div className="font-serif text-2xl font-semibold text-[#111D18]">25+</div>
                  <div className="text-xs text-[#5C6962] mt-0.5">Focused sub-views</div>
                </div>
                <div>
                  <div className="font-serif text-2xl font-semibold text-[#111D18]">2 min</div>
                  <div className="text-xs text-[#5C6962] mt-0.5">Daily check-in rhythm</div>
                </div>
              </div>
            </div>

            {/* Right Snapshot Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-[#DCE1D6] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between pb-5 border-b border-[#EEF1EA]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E6F2EC] text-xs font-semibold text-[#084C36]">
                      {snapshotBadge}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#14221C]">
                        {snapshotLabel}
                      </div>
                      <div className="text-xs text-[#67746D]">Weekly Balance Preview</div>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE1D6] bg-[#F8F9F5] px-3 py-1 text-xs font-medium text-[#14221C]">
                    <Flame className="h-3.5 w-3.5 text-[#084C36]" />
                    {streakLabel}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {PILLARS.map((pillar) => {
                    const preview = PREVIEW_SCORES[pillar.slug];
                    const liveScore = latestCachedScores[pillar.slug];
                    const pct = typeof liveScore === 'number' ? liveScore : preview.pct;
                    return (
                        <div
                            key={pillar.slug}
                            className="rounded-xl border border-[#ECEFE8] bg-[#FAFBF8] p-3"
                        >
                          <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-medium text-[#14221C]">
                          {pillar.label}
                        </span>
                            <span className="font-semibold text-[#4A5750]">
                          {pct}%
                        </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5E9E0]">
                            <div
                                className={`h-full rounded-full ${preview.bar}`}
                                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                        </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl border border-[#ECEFE8] bg-[#FAFBF8] px-4 py-3 text-xs">
                  <span className="text-[#5C6962]">Financial tracking</span>
                  <span className="font-mono font-medium text-[#084C36]">
                  Ksh · Live Budgets &amp; Savings
                </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Six Pillars Grid */}
        <section id="six-pillars" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[#111D18]">
            Six pillars, each with dedicated depth
          </h2>
          <p className="mt-2 text-sm text-[#5C6962]">
            Click into any dimension to view focused sub-tabs, progress milestones, and daily logs.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map(({ slug, label, description, subtabs, badgeBg, badgeText, Icon }) => (
                <Link
                    key={slug}
                    href={`/dashboard?pillar=${slug}`}
                    prefetch
                    className="group rounded-2xl border border-[#DFE4D9] bg-white p-6 transition hover:border-[#084C36]/40 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${badgeBg} ${badgeText}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`text-xs font-medium ${badgeText}`}>
                  {subtabs.length} sub-views
                </span>
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-[#14221C] group-hover:text-[#084C36] transition">
                    {label}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5C6962]">
                    {description}
                  </p>
                </Link>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section id="weekly-rhythm" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="flex flex-col justify-between gap-6 rounded-2xl bg-[#084C36] px-8 py-9 text-white sm:flex-row sm:items-center">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold">
                Build a steady weekly rhythm
              </h2>
              <p className="mt-1.5 text-sm text-[#CFE3DA]">
                Review cross-pillar trends every Sunday and set realistic targets for the week ahead.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                  href={user ? '/dashboard' : '/signup'}
                  prefetch
                  className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-[#084C36] hover:bg-[#F1F5F2] transition"
              >
                {user ? 'Open dashboard' : 'Create free account'}
              </Link>
              <Link
                  href={user ? '/dashboard/weekly-insights' : '/login'}
                  prefetch
                  className="rounded-lg border border-white/25 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition"
              >
                {user ? 'Weekly insights' : 'Sign in'}
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#E4E7DF] bg-[#F8F9F5]">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-[#67746D] sm:flex-row sm:px-6">
            <div>Hexad · Personal Progress System</div>
            <div className="flex items-center gap-6">
              <Link href="/dashboard" prefetch className="hover:text-[#14221C]">
                Dashboard
              </Link>
              <Link href="/dashboard/weekly-insights" prefetch className="hover:text-[#14221C]">
                Weekly Insights
              </Link>
              <Link href={user ? '/dashboard' : '/login'} prefetch className="hover:text-[#14221C]">
                {user ? 'Account' : 'Sign in'}
              </Link>
            </div>
          </div>
        </footer>
      </div>
  );
}