import {
    Activity,
    Brain,
    GraduationCap,
    Heart,
    Sparkles,
    Wallet,
} from 'lucide-react';
import { PillarSlug } from '@/types/api';

export interface PillarMeta {
    slug: PillarSlug;
    label: string;
    description: string;
    subtabs: string[];
    barColor: string;
    badgeBg: string;
    badgeText: string;
    Icon: typeof GraduationCap;
}

export const PILLARS: PillarMeta[] = [
    {
        slug: 'academics',
        label: 'Academics',
        description: 'Coursework & grades, reading list, skill mastery, and exam prep.',
        subtabs: ['Study Sessions', 'Coursework', 'Reading List', 'Skill Tracks', 'Exam Prep'],
        barColor: 'bg-[#2563EB]',
        badgeBg: 'bg-[#E8EFFD]',
        badgeText: 'text-[#2563EB]',
        Icon: GraduationCap,
    },
    {
        slug: 'emotional',
        label: 'Emotional',
        description: 'Guided journaling, relationships, boundaries, and trigger patterns.',
        subtabs: ['Mood Check-in', 'Journaling', 'Relationships', 'Boundaries', 'Triggers'],
        barColor: 'bg-[#C2410C]',
        badgeBg: 'bg-[#FDECE6]',
        badgeText: 'text-[#C2410C]',
        Icon: Heart,
    },
    {
        slug: 'spiritual',
        label: 'Spiritual',
        description: 'Gratitude journal, values & purpose, sacred reading, and breath.',
        subtabs: ['Meditation', 'Gratitude', 'Values & Purpose', 'Sacred Reading', 'Breathwork'],
        barColor: 'bg-[#6D28D9]',
        badgeBg: 'bg-[#EFEAFB]',
        badgeText: 'text-[#6D28D9]',
        Icon: Sparkles,
    },
    {
        slug: 'mental',
        label: 'Mental',
        description: 'Digital detox, stress reset, cognitive notes, and sleep wind-down.',
        subtabs: ['Focus Training', 'Digital Detox', 'Stress Reset', 'Cognitive Notes', 'Wind-down'],
        barColor: 'bg-[#059669]',
        badgeBg: 'bg-[#E6F6EF]',
        badgeText: 'text-[#059669]',
        Icon: Brain,
    },
    {
        slug: 'physical',
        label: 'Physical',
        description: 'Sleep recovery, nutrition & hydration, energy metrics, and cardio & steps.',
        subtabs: ['Workouts & Mobility', 'Sleep Recovery', 'Hydration', 'Energy', 'Cardio & Steps'],
        barColor: 'bg-[#B45309]',
        badgeBg: 'bg-[#FEF3E6]',
        badgeText: 'text-[#B45309]',
        Icon: Activity,
    },
    {
        slug: 'financial',
        label: 'Financial',
        description: 'Savings goals, investments, debt & bills, and mindful spending in Ksh.',
        subtabs: ['Budget & Cashflow', 'Savings Goals', 'Investments', 'Debts & Bills', 'Transactions'],
        barColor: 'bg-[#084C36]',
        badgeBg: 'bg-[#E6F2EC]',
        badgeText: 'text-[#084C36]',
        Icon: Wallet,
    },
];

export const PILLAR_MAP: Record<PillarSlug, PillarMeta> = PILLARS.reduce(
    (acc, item) => ({ ...acc, [item.slug]: item }),
    {} as Record<PillarSlug, PillarMeta>
);