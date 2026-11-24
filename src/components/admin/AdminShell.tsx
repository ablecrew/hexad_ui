'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    BarChart3,
    Hexagon,
    LayoutGrid,
    Loader2,
    Menu,
    Plus,
    Settings,
    Users,
    X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserAvatarPalette, isAdminUser } from '@/lib/rbac';

export const ADMIN_NAV = [
    { href: '/admin', label: 'Overview', Icon: LayoutGrid },
    { href: '/admin/users', label: 'Users', Icon: Users },
    { href: '/admin/pillars-content', label: 'Pillars & Content', Icon: Hexagon },
    { href: '/admin/analytics', label: 'Analytics', Icon: BarChart3 },
    { href: '/admin/settings', label: 'Settings', Icon: Settings },
];

interface AdminShellProps {
    subtitle: string;
    ctaLabel: string;
    onCtaClick: () => void;
    ctaIcon?: React.ReactNode;
    error?: string | null;
    statusMessage?: string | null;
    children: React.ReactNode;
}

export function AdminShell({
                               subtitle,
                               ctaLabel,
                               onCtaClick,
                               ctaIcon,
                               error,
                               statusMessage,
                               children,
                           }: AdminShellProps) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const authorized = isAdminUser(user);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        if (!authorized) {
            router.replace('/dashboard');
        }
    }, [authLoading, user, authorized, router]);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    if (authLoading || !user || !authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAF7]">
                <Loader2 className="h-6 w-6 animate-spin text-[#004635]" />
            </div>
        );
    }

    const roleLabel =
        user.is_superuser || user.role?.toLowerCase() === 'super_admin'
            ? 'Super Admin'
            : 'Admin';
    const avatarStyle = getUserAvatarPalette(user.email || user.id);

    const renderNavContent = () => (
        <>
            <div>
                <Link
                    href="/admin"
                    prefetch
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-2 py-2 mb-6"
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#004635] text-white">
                        <Hexagon className="h-5 w-5" />
                    </div>
                    <div className="leading-tight">
                        <div className="text-sm font-semibold text-[#14221C]">Hexad</div>
                        <div className="text-[11px] text-[#707974]">Admin Console</div>
                    </div>
                </Link>

                <div className="text-[10px] font-semibold tracking-wider text-[#707974] px-3 mb-2">
                    MANAGEMENT
                </div>
                <div className="space-y-1">
                    {ADMIN_NAV.map(({ href, label, Icon }) => {
                        const active = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                prefetch
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 lg:py-2 text-xs transition ${
                                    active
                                        ? 'bg-[#004635] font-semibold text-white'
                                        : 'font-medium text-[#3A4740] hover:bg-[#ECEEEB]'
                                }`}
                            >
                                <Icon
                                    className={`h-4 w-4 ${active ? 'text-white' : 'text-[#707974]'}`}
                                />
                                {label}
                            </Link>
                        );
                    })}
                </div>

                <div className="my-5 border-t border-[#BFC9C3]/60 pt-4">
                    <Link
                        href="/dashboard"
                        prefetch
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 lg:py-2 text-xs font-medium text-[#3A4740] hover:bg-[#ECEEEB] transition"
                    >
                        <ArrowLeft className="h-4 w-4 text-[#707974]" />
                        User App
                    </Link>
                </div>
            </div>

            <div className="border-t border-[#BFC9C3]/60 pt-3">
                <div className="flex items-center gap-2.5 px-2 py-1.5">
                    <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                        style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.text }}
                    >
                        {user.initials || 'HX'}
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-[#14221C]">
                            {user.full_name}
                        </div>
                        <div className="text-[11px] text-[#707974]">{roleLabel}</div>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAF7] text-[#2E312F]">
            {/* Mobile Top Bar */}
            <header className="sticky top-0 z-30 flex lg:hidden items-center justify-between border-b border-[#BFC9C3]/60 bg-[#FBFBF8] px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        aria-label="Open navigation menu"
                        className="rounded-lg p-2 text-[#14221C] hover:bg-[#ECEEEB] transition"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <Link href="/admin" prefetch className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#004635] text-white">
                            <Hexagon className="h-4 w-4" />
                        </div>
                        <div className="leading-tight">
                            <div className="text-sm font-semibold text-[#14221C]">Hexad</div>
                            <div className="text-[10px] text-[#707974]">Admin Console</div>
                        </div>
                    </Link>
                </div>

                <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.text }}
                    title={user.full_name}
                >
                    {user.initials || 'HX'}
                </div>
            </header>

            {/* Mobile Drawer */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex lg:hidden">
                    <div
                        className="fixed inset-0 bg-black/35"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <aside className="relative z-10 flex w-72 max-w-[82vw] flex-col justify-between bg-[#FBFBF8] p-4 shadow-xl">
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            aria-label="Close navigation menu"
                            className="absolute right-3 top-3 rounded-lg p-1.5 text-[#707974] hover:bg-[#ECEEEB]"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        {renderNavContent()}
                    </aside>
                </div>
            )}

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-[#BFC9C3]/60 bg-[#FBFBF8] p-4">
                {renderNavContent()}
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 px-4 py-5 sm:px-8 sm:py-6 max-w-6xl mx-auto w-full">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#111D18]">
                            Admin Console
                        </h1>
                        <p className="text-xs text-[#707974] mt-1">{subtitle}</p>
                    </div>

                    <button
                        type="button"
                        onClick={onCtaClick}
                        className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#1B5E4B] transition shrink-0"
                    >
                        {ctaIcon ?? <Plus className="h-3.5 w-3.5" />}
                        {ctaLabel}
                    </button>
                </div>

                {/* Top Segmented Tabs — horizontally scrollable on narrow mobile screens */}
                <nav
                    aria-label="Admin sections"
                    className="mt-5 sm:mt-6 flex w-full sm:w-fit max-w-full overflow-x-auto no-scrollbar items-center gap-1 rounded-xl border border-[#ECEEEB] bg-[#ECEEEB]/80 p-1"
                >
                    {ADMIN_NAV.map((item) => {
                        const active = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch
                                className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs transition ${
                                    active
                                        ? 'bg-white font-semibold text-[#111D18] shadow-2xs'
                                        : 'font-medium text-[#4A5750] hover:text-[#14221C]'
                                }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {error && (
                    <div className="mt-4 rounded-lg border border-[#BA1A1A]/30 bg-[#FFDAD6] px-4 py-2.5 text-xs text-[#BA1A1A]">
                        {error}
                    </div>
                )}

                {statusMessage && (
                    <div className="mt-4 rounded-lg border border-[#004635]/20 bg-[#E6F2EC] px-4 py-2.5 text-xs text-[#004635]">
                        {statusMessage}
                    </div>
                )}

                {children}
            </main>
        </div>
    );
}