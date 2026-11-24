'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAuth } from '@/context/AuthContext';
import { adminApi, AdminPlatformSettings } from '@/lib/admin-api';
import { isAdminUser } from '@/lib/rbac';

export default function AdminSettingsPage() {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const [appName, setAppName] = useState('Hexad');
    const [currency, setCurrency] = useState<'KSH' | 'USD' | 'EUR'>('KSH');
    const [digestDay, setDigestDay] = useState('Sunday evening');
    const [remindersEnabled, setRemindersEnabled] = useState(true);
    const [landingPreviewEnabled, setLandingPreviewEnabled] = useState(true);
    const [selfServeSignup, setSelfServeSignup] = useState(true);

    const loadSettings = useCallback(async () => {
        if (!user || !isAdminUser(user)) return;
        const res = await adminApi.getSettings();
        if (res) {
            setAppName(res.app_name || 'Hexad');
            setCurrency(res.default_currency || 'KSH');
            setDigestDay(res.weekly_digest_day || 'Sunday evening');
            setRemindersEnabled(Boolean(res.daily_checkin_reminders));
            setLandingPreviewEnabled(Boolean(res.public_landing_preview));
            setSelfServeSignup(Boolean(res.self_serve_signup));
        }
    }, [user]);

    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

    const handleSaveSettings = async () => {
        setSaving(true);
        setError(null);
        setStatusMessage(null);
        try {
            const payload: AdminPlatformSettings = {
                app_name: appName.trim() || 'Hexad',
                default_currency: currency,
                weekly_digest_day: digestDay,
                daily_checkin_reminders: remindersEnabled,
                public_landing_preview: landingPreviewEnabled,
                self_serve_signup: selfServeSignup,
            };
            await adminApi.saveSettings(payload);
            setStatusMessage('Platform settings saved.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save settings.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminShell
            subtitle="Manage workspace defaults, currency settings, and feature flags."
            ctaLabel="Save settings"
            ctaIcon={
                saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <Check className="h-3.5 w-3.5" />
                )
            }
            onCtaClick={() => void handleSaveSettings()}
            error={error}
            statusMessage={statusMessage}
        >
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-6">
                    <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                        Platform Defaults
                    </h2>
                    <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-[#14221C] mb-1.5">
                                Application Name
                            </label>
                            <input
                                type="text"
                                value={appName}
                                onChange={(e) => setAppName(e.target.value)}
                                className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[#14221C] mb-1.5">
                                Default Financial Currency
                            </label>
                            <select
                                value={currency}
                                onChange={(e) =>
                                    setCurrency(e.target.value as 'KSH' | 'USD' | 'EUR')
                                }
                                className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                            >
                                <option value="KSH">KSH — Kenyan Shilling (Ksh)</option>
                                <option value="USD">USD — US Dollar ($)</option>
                                <option value="EUR">EUR — Euro (€)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[#14221C] mb-1.5">
                                Weekly Insights Digest Day
                            </label>
                            <select
                                value={digestDay}
                                onChange={(e) => setDigestDay(e.target.value)}
                                className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                            >
                                <option value="Sunday evening">Sunday evening</option>
                                <option value="Monday morning">Monday morning</option>
                                <option value="Friday evening">Friday evening</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-6">
                    <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                        Feature Controls
                    </h2>
                    <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                        <button
                            type="button"
                            onClick={() => setRemindersEnabled((v) => !v)}
                            className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-[#F8FAF7] transition"
                        >
                            <div>
                                <div className="text-sm font-semibold text-[#14221C]">
                                    Daily Check-in Reminders
                                </div>
                                <div className="text-xs text-[#707974] mt-0.5">
                                    Evening nudge for active pillars
                                </div>
                            </div>
                            <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                                    remindersEnabled
                                        ? 'bg-[#004635] text-white'
                                        : 'border border-[#BFC9C3] text-transparent'
                                }`}
                            >
                <Check className="h-3 w-3" />
              </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setLandingPreviewEnabled((v) => !v)}
                            className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-[#F8FAF7] transition"
                        >
                            <div>
                                <div className="text-sm font-semibold text-[#14221C]">
                                    Public Landing Preview
                                </div>
                                <div className="text-xs text-[#707974] mt-0.5">
                                    Allow guest dashboard walkthrough
                                </div>
                            </div>
                            <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                                    landingPreviewEnabled
                                        ? 'bg-[#004635] text-white'
                                        : 'border border-[#BFC9C3] text-transparent'
                                }`}
                            >
                <Check className="h-3 w-3" />
              </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelfServeSignup((v) => !v)}
                            className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-[#F8FAF7] transition"
                        >
                            <div>
                                <div className="text-sm font-semibold text-[#14221C]">
                                    Self-Serve Signup
                                </div>
                                <div className="text-xs text-[#707974] mt-0.5">
                                    Open registration with email &amp; OAuth
                                </div>
                            </div>
                            <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                                    selfServeSignup
                                        ? 'bg-[#004635] text-white'
                                        : 'border border-[#BFC9C3] text-transparent'
                                }`}
                            >
                <Check className="h-3 w-3" />
              </span>
                        </button>
                    </div>
                </div>
            </div>
        </AdminShell>
    );
}