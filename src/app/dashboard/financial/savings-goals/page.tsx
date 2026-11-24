'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { FinancialShell } from '@/components/financial/FinancialShell';
import { useAuth } from '@/context/AuthContext';
import { coreApi } from '@/lib/dashboard-api';
import {
    financialApi,
    formatKsh,
    TransactionItem,
} from '@/lib/financial-api';
import { PillarGoal } from '@/types/api';

export default function SavingsGoalsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [goals, setGoals] = useState<PillarGoal[]>([]);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [currentKsh, setCurrentKsh] = useState('0');
    const [targetKsh, setTargetKsh] = useState('100000');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [goalsRes, txRes] = await Promise.all([
                financialApi.getFinancialGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                financialApi.getTransactions().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);
            setGoals(goalsRes.results);
            setTransactions(txRes.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load savings goals.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const totalSavedKsh = useMemo(
        () => goals.reduce((acc, g) => acc + (Number(g.current_value) || 0), 0),
        [goals]
    );

    const transfers = useMemo(
        () => transactions.filter((t) => t.tx_type === 'transfer'),
        [transactions]
    );

    const handleCreateGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            await coreApi.createGoal({
                pillar_slug: 'financial',
                subtab_slug: 'savings-goals',
                title: title.trim(),
                cadence: 'monthly',
                current_value: Number(currentKsh) || 0,
                target_value: Math.max(1, Number(targetKsh) || 100000),
                unit: 'Ksh',
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save savings goal.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FinancialShell
            subtitle="Monthly budgets, savings targets, investments, and mindful spending habits."
            ctaLabel="Add savings goal"
            onCtaClick={() => {
                setTitle('');
                setCurrentKsh('0');
                setTargetKsh('100000');
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
                            <div className="text-xs text-[#707974]">Total Saved</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#006D3E]">
                                {formatKsh(totalSavedKsh)}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Across {goals.length} savings buckets
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Active Buckets</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.filter((g) => g.status === 'active').length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Dedicated targets</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Transfers Logged</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {transfers.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Automated &amp; manual</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Goal Completion</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.length > 0
                                    ? `${Math.round(
                                        goals.reduce((a, g) => {
                                            const t = Number(g.target_value) || 1;
                                            const c = Number(g.current_value) || 0;
                                            return a + Math.min(100, (c / t) * 100);
                                        }, 0) / goals.length
                                    )}%`
                                    : '0%'}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Average progress</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Active Savings Buckets
                            </h2>
                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No savings buckets created yet.
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {goals.map((g) => {
                                        const target = Number(g.target_value) || 1;
                                        const current = Number(g.current_value) || 0;
                                        const pct = Math.min(100, Math.max(0, Math.round((current / target) * 100)));
                                        return (
                                            <div
                                                key={g.id}
                                                className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-[#14221C]">
                                                            {g.title}
                                                        </div>
                                                        <div className="text-xs text-[#707974] capitalize mt-0.5">
                                                            {g.cadence} savings bucket
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-xs font-semibold text-[#006D3E]">
                            {pct}%
                          </span>
                                                </div>
                                                <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-[#ECEEEB]">
                                                    <div
                                                        className="h-full rounded-full bg-[#006D3E]"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <div className="mt-2.5 font-mono text-xs text-[#707974]">
                                                    {formatKsh(current)} / {formatKsh(target)} funded
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Automated Transfers
                            </h2>
                            {transfers.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No transfer entries recorded yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {transfers.slice(0, 6).map((t) => (
                                        <div
                                            key={t.id}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {t.title}
                                                </div>
                                                <div className="font-mono text-[11px] text-[#707974] mt-0.5">
                                                    {t.tx_date} · {t.category}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#006D3E] shrink-0">
                        {formatKsh(t.amount_ksh)}
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
                                Add savings goal
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateGoal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Bucket Name
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
                                        Current Saved (Ksh)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={currentKsh}
                                        onChange={(e) => setCurrentKsh(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Target Amount (Ksh)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        required
                                        value={targetKsh}
                                        onChange={(e) => setTargetKsh(e.target.value)}
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
        </FinancialShell>
    );
}