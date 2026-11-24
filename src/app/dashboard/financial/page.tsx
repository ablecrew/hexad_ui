'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { FinancialShell } from '@/components/financial/FinancialShell';
import { useAuth } from '@/context/AuthContext';
import { FinancialSummary } from '@/lib/dashboard-api';
import {
    financialApi,
    formatKsh,
    TransactionItem,
} from '@/lib/financial-api';
import { PillarGoal } from '@/types/api';

export default function BudgetCashflowPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [goals, setGoals] = useState<PillarGoal[]>([]);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [amountKsh, setAmountKsh] = useState('');
    const [txType, setTxType] = useState<'income' | 'expense' | 'transfer'>('expense');
    const [category, setCategory] = useState('Cashflow');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, goalsRes, txRes] = await Promise.all([
                financialApi.getSummary().catch(() => null),
                financialApi.getFinancialGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                financialApi.getTransactions().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);
            setSummary(sumRes);
            setGoals(goalsRes.results);
            setTransactions(txRes.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load financial data.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const savingsRatePct = useMemo(() => {
        const income = Number(summary?.monthly_income_ksh ?? 0);
        const expenses = Number(summary?.monthly_expenses_ksh ?? 0);
        if (income <= 0) return 0;
        return Math.max(0, Math.round(((income - expenses) / income) * 100));
    }, [summary]);

    const handleCreateEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            const now = new Date();
            const txDate = now.toISOString().slice(0, 10);
            const occurredAt = now.toISOString();

            await financialApi.createTransaction({
                title: title.trim(),
                category: category.trim() || 'Cashflow',
                amount_ksh: Number(amountKsh) || 0,
                tx_type: txType,
                tx_date: txDate,
                occurred_at: occurredAt,
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save financial entry.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FinancialShell
            subtitle="Monthly budgets, savings targets, investments, and mindful spending habits."
            ctaLabel="Log financial check-in"
            onCtaClick={() => {
                setTitle('');
                setAmountKsh('');
                setTxType('expense');
                setCategory('Cashflow');
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
                            <div className="text-xs text-[#707974]">Monthly Savings Rate</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#006D3E]">
                                {savingsRatePct}%
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Income {formatKsh(summary?.monthly_income_ksh)}
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Net Worth</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {formatKsh(summary?.net_worth_ksh)}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Assets {formatKsh(summary?.total_assets_ksh)}
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Monthly Expenses</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {formatKsh(summary?.monthly_expenses_ksh)}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Current month outflow</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Total Debt</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {formatKsh(summary?.total_debts_ksh)}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Tracked liabilities</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Financial Milestones
                            </h2>
                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No financial milestones created yet.
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {goals.map((goal) => {
                                        const target = Number(goal.target_value) || 1;
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
                                                        <div className="text-xs text-[#707974] capitalize mt-0.5">
                                                            {goal.cadence} milestone · {goal.status}
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
                                                <div className="mt-2.5 flex items-center justify-between text-xs text-[#707974]">
                                                    <span className="font-mono">
                                                        {formatKsh(current)} / {formatKsh(target)}
                                                    </span>
                                                    <span className="font-mono">
                                                        {goal.due_date ? `Due ${goal.due_date}` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Recent Activity
                            </h2>
                            {transactions.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No recent transactions logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {transactions.slice(0, 6).map((tx) => (
                                        <div
                                            key={tx.id}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {tx.title}
                                                </div>
                                                <div className="font-mono text-[11px] text-[#707974] mt-0.5">
                                                    {tx.tx_date} · {tx.category}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#006D3E] shrink-0">
                                                {tx.tx_type === 'expense' ? '-' : '+'}
                                                {formatKsh(tx.amount_ksh)}
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
                                Log financial check-in
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateEntry} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Title
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
                                        Type
                                    </label>
                                    <select
                                        value={txType}
                                        onChange={(e) =>
                                            setTxType(e.target.value as 'income' | 'expense' | 'transfer')
                                        }
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    >
                                        <option value="expense">Expense</option>
                                        <option value="income">Income</option>
                                        <option value="transfer">Transfer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Amount (Ksh)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        required
                                        value={amountKsh}
                                        onChange={(e) => setAmountKsh(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Category
                                </label>
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
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
                    </div>
                </div>
            )}
        </FinancialShell>
    );
}