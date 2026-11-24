'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { FinancialShell } from '@/components/financial/FinancialShell';
import { useAuth } from '@/context/AuthContext';
import { FinancialSummary } from '@/lib/dashboard-api';
import {
    AccountItem,
    financialApi,
    formatKsh,
    formatNairobiDate,
    TransactionItem,
} from '@/lib/financial-api';
import { PillarGoal } from '@/types/api';

export default function DebtBillsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [accounts, setAccounts] = useState<AccountItem[]>([]);
    const [goals, setGoals] = useState<PillarGoal[]>([]);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [accountId, setAccountId] = useState<string>('');
    const [title, setTitle] = useState('');
    const [amountKsh, setAmountKsh] = useState('');
    const [category, setCategory] = useState('Bills');
    const [txDate, setTxDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, accRes, goalsRes, txRes] = await Promise.all([
                financialApi.getSummary().catch(() => null),
                financialApi.getAccounts().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                financialApi.getFinancialGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                financialApi.getTransactions().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);
            setSummary(sumRes);
            setAccounts(accRes.results);
            if (accRes.results.length > 0) {
                setAccountId((prev) => prev || String(accRes.results[0].id));
            }
            setGoals(goalsRes.results);
            setTransactions(txRes.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load debt & bills.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const billItems = useMemo(
        () => transactions.filter((t) => t.tx_type === 'expense'),
        [transactions]
    );

    const handleCreateBill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            const numericAmount = Math.max(0, Number(amountKsh) || 0);
            const dateValue = txDate || formatNairobiDate();
            await financialApi.createTransaction({
                ...(accountId ? { account: Number(accountId) } : {}),
                title: title.trim(),
                category: category.trim() || 'Bills',
                amount_ksh: numericAmount.toFixed(2),
                tx_type: 'expense',
                occurred_at: dateValue,
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save bill.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FinancialShell
            subtitle="Monthly budgets, savings targets, investments, and mindful spending habits."
            ctaLabel="Add bill or payment"
            onCtaClick={() => {
                setTitle('');
                setAmountKsh('');
                setCategory('Bills');
                setTxDate(formatNairobiDate());
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
                            <div className="text-xs text-[#707974]">Remaining Debt</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#006D3E]">
                                {formatKsh(summary?.total_debts_ksh)}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Tracked liabilities</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Monthly Fixed Bills</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {formatKsh(summary?.monthly_expenses_ksh)}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Monthly outflow</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Recorded Bills</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {billItems.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Logged expense items</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Debt &amp; Bill Goals</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Active targets</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Debt &amp; Fixed Bills
                            </h2>
                            {goals.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No debt payoff or reserve targets created yet.
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
                                                            {g.cadence} obligation
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
                                                    {formatKsh(current)} / {formatKsh(target)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Upcoming Bills
                            </h2>
                            {billItems.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No bills logged yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {billItems.slice(0, 6).map((bill) => (
                                        <div
                                            key={bill.id}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {bill.title}
                                                </div>
                                                <div className="font-mono text-[11px] text-[#707974] mt-0.5">
                                                    {bill.tx_date} · {bill.category}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#111D18] shrink-0">
                        {formatKsh(bill.amount_ksh)}
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
                                Add bill or payment
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateBill} className="space-y-4">
                            {accounts.length > 0 && (
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Account
                                    </label>
                                    <select
                                        value={accountId}
                                        onChange={(e) => setAccountId(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    >
                                        {accounts.map((acc) => (
                                            <option key={acc.id} value={String(acc.id)}>
                                                {acc.name} ({formatKsh(acc.balance_ksh)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Bill / Liability Name
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
                                        Amount (Ksh)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        required
                                        value={amountKsh}
                                        onChange={(e) => setAmountKsh(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
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
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={txDate}
                                    onChange={(e) => setTxDate(e.target.value)}
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