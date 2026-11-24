'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Brain,
    Dumbbell,
    GraduationCap,
    Heart,
    Sparkles,
    Wallet,
    X,
} from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';

const PILLAR_MODULES = [
    {
        title: 'Academics',
        href: '/dashboard/academics',
        subtabs: 'Coursework, Reading List, Skill Mastery, Exam Prep',
        adoption: '86% adoption',
        adoptionColor: '#1D6FA5',
        badgeBg: 'bg-[#E5F0FA] text-[#1D6FA5]',
        Icon: GraduationCap,
    },
    {
        title: 'Emotional',
        href: '/dashboard/emotional',
        subtabs: 'Guided Journaling, Relationships, Boundaries, Triggers',
        adoption: '75% adoption',
        adoptionColor: '#974722',
        badgeBg: 'bg-[#FFDBCF] text-[#974722]',
        Icon: Heart,
    },
    {
        title: 'Spiritual',
        href: '/dashboard/spiritual',
        subtabs: 'Gratitude Journal, Values, Sacred Reading, Silence',
        adoption: '78% adoption',
        adoptionColor: '#5A52B5',
        badgeBg: 'bg-[#ECE9FC] text-[#5A52B5]',
        Icon: Sparkles,
    },
    {
        title: 'Mental',
        href: '/dashboard/mental',
        subtabs: 'Digital Detox, Stress Reset, Cognitive Notes, Wind-down',
        adoption: '81% adoption',
        adoptionColor: '#007A63',
        badgeBg: 'bg-[#E2F4EE] text-[#007A63]',
        Icon: Brain,
    },
    {
        title: 'Physical',
        href: '/dashboard/physical',
        subtabs: 'Sleep Recovery, Nutrition, Energy Metrics, Cardio',
        adoption: '84% adoption',
        adoptionColor: '#8F4A00',
        badgeBg: 'bg-[#FFDBBC] text-[#8F4A00]',
        Icon: Dumbbell,
    },
    {
        title: 'Financial (Ksh)',
        href: '/dashboard/financial',
        subtabs: 'Savings Goals, Investments, Debt & Bills, Spending',
        adoption: '91% adoption',
        adoptionColor: '#006A4E',
        badgeBg: 'bg-[#E2F3EA] text-[#006A4E]',
        Icon: Wallet,
    },
];

export default function AdminPillarsContentPage() {
    const [modalOpen, setModalOpen] = useState(false);
    const [packTitle, setPackTitle] = useState('');
    const [packPillar, setPackPillar] = useState('Emotional');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const handleAddPack = (e: React.FormEvent) => {
        e.preventDefault();
        if (!packTitle.trim()) return;
        setStatusMessage(`Prompt pack "${packTitle.trim()}" added to ${packPillar}.`);
        setPackTitle('');
        setModalOpen(false);
    };

    return (
        <AdminShell
            subtitle="Configure the six life pillars, sub-tab modules, and default prompts."
            ctaLabel="Add prompt pack"
            onCtaClick={() => {
                setPackTitle('');
                setPackPillar('Emotional');
                setModalOpen(true);
            }}
            statusMessage={statusMessage}
        >
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                    <div className="text-xs text-[#707974]">Active Pillars</div>
                    <div className="mt-2 font-mono text-2xl font-semibold text-[#004635]">
                        6 / 6
                    </div>
                    <div className="mt-1 text-xs text-[#707974]">All modules published</div>
                </div>

                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                    <div className="text-xs text-[#707974]">Sub-Tab Views</div>
                    <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                        24
                    </div>
                    <div className="mt-1 text-xs text-[#707974]">4 dedicated tabs per pillar</div>
                </div>

                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                    <div className="text-xs text-[#707974]">Guided Prompts</div>
                    <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                        96
                    </div>
                    <div className="mt-1 text-xs text-[#707974]">Across journaling &amp; values</div>
                </div>

                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                    <div className="text-xs text-[#707974]">Avg Completion</div>
                    <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                        82%
                    </div>
                    <div className="mt-1 text-xs text-[#707974]">Weekly check-in rate</div>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {PILLAR_MODULES.map(
                    ({ title, href, subtabs, adoption, adoptionColor, badgeBg, Icon }) => (
                        <div
                            key={title}
                            className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5 flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-start justify-between">
                                    <div
                                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${badgeBg}`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <span className="rounded-full bg-[#E6F2EC] px-2.5 py-0.5 text-[11px] font-medium text-[#004635]">
                    Live
                  </span>
                                </div>

                                <div className="mt-4 text-sm font-semibold text-[#14221C]">
                                    {title}
                                </div>
                                <p className="mt-1 text-xs text-[#707974] leading-relaxed">
                                    {subtabs}
                                </p>
                            </div>

                            <div className="mt-5 flex items-center justify-between border-t border-[#ECEEEB] pt-3 text-xs">
                <span
                    className="font-mono font-semibold"
                    style={{ color: adoptionColor }}
                >
                  {adoption}
                </span>
                                <Link
                                    href={href}
                                    prefetch
                                    className="font-medium text-[#14221C] hover:text-[#004635]"
                                >
                                    Open
                                </Link>
                            </div>
                        </div>
                    )
                )}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add prompt pack
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddPack} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Pillar
                                </label>
                                <select
                                    value={packPillar}
                                    onChange={(e) => setPackPillar(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                >
                                    {PILLAR_MODULES.map((m) => (
                                        <option key={m.title} value={m.title}>
                                            {m.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Prompt Pack Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={packTitle}
                                    onChange={(e) => setPackTitle(e.target.value)}
                                    placeholder="e.g., Weekly Boundaries Reset"
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
                                    className="rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B]"
                                >
                                    Save pack
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminShell>
    );
}