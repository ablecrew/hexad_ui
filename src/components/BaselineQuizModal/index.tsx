'use client';

import React, { useState } from 'react';
import { Hexagon, Sparkles, X } from 'lucide-react';
import { PILLARS } from '@/lib/pillars';
import { PillarSlug } from '@/types/api';
import { PillarScore } from '@/components/HexadRadarChart';

interface BaselineQuizModalProps {
    open: boolean;
    initialScores?: PillarScore[];
    onClose: () => void;
    onSave: (scores: PillarScore[]) => Promise<void> | void;
}

export function BaselineQuizModal({
                                      open,
                                      initialScores,
                                      onClose,
                                      onSave,
                                  }: BaselineQuizModalProps) {
    const [ratings, setRatings] = useState<Record<PillarSlug, number>>(() => {
        const defaults = {} as Record<PillarSlug, number>;
        for (const p of PILLARS) {
            const existing = initialScores?.find((s) => s.slug === p.slug);
            defaults[p.slug] = existing?.current ?? 5;
        }
        return defaults;
    });
    const [saving, setSaving] = useState(false);

    if (!open) return null;

    const handleSliderChange = (slug: PillarSlug, value: number) => {
        setRatings((prev) => ({ ...prev, [slug]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const formatted: PillarScore[] = PILLARS.map((p) => {
                const current = ratings[p.slug] ?? 5;
                return {
                    slug: p.slug,
                    current,
                    target: Math.min(10, Math.max(current + 2, 8)),
                };
            });
            await onSave(formatted);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs">
            <div className="w-full max-w-[480px] rounded-2xl border border-[#DFE4D9] bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#084C36] text-white">
                            <Hexagon className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                                30-Second Life Pulse
                            </h2>
                            <p className="text-xs text-[#5C6962]">
                                Rate where each pillar stands today to shape your Hexagon.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close baseline quiz"
                        className="rounded-lg p-1.5 text-[#67746D] hover:bg-[#F2F4EE] hover:text-[#14221C]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    {PILLARS.map((pillar) => {
                        const val = ratings[pillar.slug] ?? 5;
                        return (
                            <div key={pillar.slug} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-[#14221C]">
                                        {pillar.label}
                                    </span>
                                    <span className="rounded-md bg-[#EEF3EE] px-2 py-0.5 font-semibold text-[#084C36]">
                                        {val} / 10
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={1}
                                    max={10}
                                    step={1}
                                    value={val}
                                    onChange={(e) =>
                                        handleSliderChange(pillar.slug, Number(e.target.value))
                                    }
                                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#E4E9DF] accent-[#084C36]"
                                />
                            </div>
                        );
                    })}

                    <div className="pt-2 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-[#DCE1D6] px-4 py-2 text-xs font-medium text-[#4A5750] hover:bg-[#F7F8F4]"
                        >
                            Skip for now
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-1.5 rounded-lg bg-[#084C36] px-4 py-2 text-xs font-semibold text-white hover:bg-[#063A29] disabled:opacity-60"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            {saving ? 'Generating...' : 'Build My Hexagon'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}