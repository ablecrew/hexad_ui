'use client';

import React, { useState } from 'react';
import { PILLARS } from '@/lib/pillars';
import { PillarSlug } from '@/types/api';

export interface PillarScore {
    slug: PillarSlug;
    current: number; // 0 to 10
    target: number;  // 0 to 10
}

interface HexadRadarChartProps {
    scores: PillarScore[];
    onSelectPillar?: (slug: PillarSlug) => void;
    onRecalibrate?: () => void;
}

const SIZE = 340;
const CENTER = SIZE / 2;
const MAX_RADIUS = 112;
const LEVELS = [2, 4, 6, 8, 10];

function polarToCartesian(index: number, total: number, value: number): [number, number] {
    // Start at top (-90 deg) and move clockwise
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const radius = (Math.max(0, Math.min(10, value)) / 10) * MAX_RADIUS;
    return [
        CENTER + radius * Math.cos(angle),
        CENTER + radius * Math.sin(angle),
    ];
}

export function HexadRadarChart({
                                    scores,
                                    onSelectPillar,
                                    onRecalibrate,
                                }: HexadRadarChartProps) {
    const [activeSlug, setActiveSlug] = useState<PillarSlug | null>(null);
    const [showTarget, setShowTarget] = useState(true);

    const orderedPillars = PILLARS.map((pillar) => {
        const found = scores.find((s) => s.slug === pillar.slug);
        return {
            ...pillar,
            current: found?.current ?? 5,
            target: found?.target ?? 8,
        };
    });

    const total = orderedPillars.length;

    const currentPoints = orderedPillars
        .map((p, i) => polarToCartesian(i, total, p.current).join(','))
        .join(' ');

    const targetPoints = orderedPillars
        .map((p, i) => polarToCartesian(i, total, p.target).join(','))
        .join(' ');

    const averageScore = (
        orderedPillars.reduce((sum, p) => sum + p.current, 0) / Math.max(1, total)
    ).toFixed(1);

    const lowestPillar = [...orderedPillars].sort((a, b) => a.current - b.current)[0];
    const activePillar = orderedPillars.find((p) => p.slug === activeSlug) ?? null;

    return (
        <div className="rounded-2xl border border-[#DFE4D9] bg-white p-6 shadow-xs">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-serif text-xl font-semibold text-[#111D18]">
                            Life Balance Hexagon
                        </h2>
                        <span className="rounded-full bg-[#E8F3EE] px-2.5 py-0.5 text-xs font-semibold text-[#084C36]">
                            {averageScore} / 10 avg
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-[#5C6962]">
                        Tap any vertex to inspect momentum or jump into that pillar.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowTarget((prev) => !prev)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                            showTarget
                                ? 'border-[#084C36]/30 bg-[#F2F7F4] text-[#084C36]'
                                : 'border-[#DCE1D6] bg-white text-[#5C6962]'
                        }`}
                    >
                        {showTarget ? 'Hide Target' : 'Show Target'}
                    </button>
                    {onRecalibrate && (
                        <button
                            type="button"
                            onClick={onRecalibrate}
                            className="rounded-lg bg-[#084C36] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#063A29] transition"
                        >
                            Recalibrate
                        </button>
                    )}
                </div>
            </div>

            {/* Radar SVG */}
            <div className="mt-4 flex flex-col items-center">
                <svg
                    viewBox={`0 0 ${SIZE} ${SIZE}`}
                    className="w-full max-w-[340px] select-none overflow-visible"
                    role="img"
                    aria-label="Hexad six-pillar life balance radar chart"
                >
                    {/* Concentric hexagon grid rings */}
                    {LEVELS.map((level) => {
                        const ringPoints = orderedPillars
                            .map((_, i) => polarToCartesian(i, total, level).join(','))
                            .join(' ');
                        return (
                            <polygon
                                key={level}
                                points={ringPoints}
                                fill="none"
                                stroke="#E4E9DF"
                                strokeWidth={level === 10 ? '1.5' : '1'}
                            />
                        );
                    })}

                    {/* Axis spokes */}
                    {orderedPillars.map((pillar, i) => {
                        const [x, y] = polarToCartesian(i, total, 10);
                        return (
                            <line
                                key={pillar.slug}
                                x1={CENTER}
                                y1={CENTER}
                                x2={x}
                                y2={y}
                                stroke="#E4E9DF"
                                strokeWidth="1"
                            />
                        );
                    })}

                    {/* Target polygon (dashed) */}
                    {showTarget && (
                        <polygon
                            points={targetPoints}
                            fill="rgba(8, 76, 54, 0.05)"
                            stroke="#7FA393"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                        />
                    )}

                    {/* Current momentum polygon */}
                    <polygon
                        points={currentPoints}
                        fill="rgba(8, 76, 54, 0.22)"
                        stroke="#084C36"
                        strokeWidth="2.25"
                        className="transition-all duration-300"
                    />

                    {/* Interactive vertices and labels */}
                    {orderedPillars.map((pillar, i) => {
                        const [vx, vy] = polarToCartesian(i, total, pillar.current);
                        const [lx, ly] = polarToCartesian(i, total, 12.2);
                        const isSelected = activeSlug === pillar.slug;

                        return (
                            <g
                                key={pillar.slug}
                                className="cursor-pointer"
                                onMouseEnter={() => setActiveSlug(pillar.slug)}
                                onClick={() => {
                                    setActiveSlug(pillar.slug);
                                    onSelectPillar?.(pillar.slug);
                                }}
                            >
                                {/* Larger invisible hit area for mobile taps */}
                                <circle cx={vx} cy={vy} r={14} fill="transparent" />
                                <circle
                                    cx={vx}
                                    cy={vy}
                                    r={isSelected ? 6.5 : 4.5}
                                    fill={isSelected ? '#111D18' : '#084C36'}
                                    stroke="#FFFFFF"
                                    strokeWidth="2"
                                    className="transition-all duration-150"
                                />
                                <text
                                    x={lx}
                                    y={ly}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className={`text-[11px] font-medium transition-colors ${
                                        isSelected ? 'fill-[#084C36] font-semibold' : 'fill-[#35443D]'
                                    }`}
                                >
                                    {pillar.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Live Inspection / Nudge Footer */}
            <div className="mt-3 rounded-xl border border-[#ECEFE8] bg-[#F8F9F5] px-4 py-3 text-xs">
                {activePillar ? (
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <span className="font-semibold text-[#111D18]">
                                {activePillar.label}:
                            </span>{' '}
                            <span className="text-[#4A5750]">
                                Current <strong>{activePillar.current}/10</strong> · Target{' '}
                                <strong>{activePillar.target}/10</strong>
                            </span>
                        </div>
                        {onSelectPillar && (
                            <button
                                type="button"
                                onClick={() => onSelectPillar(activePillar.slug)}
                                className="font-semibold text-[#084C36] hover:underline"
                            >
                                Open pillar →
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-2 text-[#4A5750]">
                        <span>
                            <strong>Focus opportunity:</strong>{' '}
                            <span className="text-[#111D18] font-medium">
                                {lowestPillar.label}
                            </span>{' '}
                            is currently your lowest pillar ({lowestPillar.current}/10).
                        </span>
                        {onSelectPillar && (
                            <button
                                type="button"
                                onClick={() => onSelectPillar(lowestPillar.slug)}
                                className="shrink-0 font-semibold text-[#084C36] hover:underline"
                            >
                                Boost →
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}