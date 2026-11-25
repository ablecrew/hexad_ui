'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { FinancialShell } from '@/components/financial/FinancialShell';
import { useAuth } from '@/context/AuthContext';
import {
    financialApi,
    formatKsh,
    formatNairobiMonthKey,
    SpendingBudgetItem,
    TransactionItem,
} from '@/lib/financial-api';

function getBudgetLimit(item: SpendingBudgetItem): number {
    return Number(item.monthly_cap_ksh ?? item.monthly_limit_ksh ?? item.limit_ksh ?? 0) || 0;
}

function getBudgetSpent(item: SpendingBudgetItem): number {
    return Number(item.spent_ksh ?? 0) || 0;
}

export default function SpendingHabitsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [budgets, setBudgets] = useState<SpendingBudgetItem[]>([]);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [category, setCategory] = useState('');
    const [monthKey, setMonthKey] = useState('');
    const [spentKsh, setSpentKsh] = useState('0');
    const [limitKsh, setLimitKsh] = useState('25000');
    const [ruleNote, setRuleNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setMonthKey((prev) => prev || formatNairobiMonthKey());
    }, []);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [budgetsRes, txRes] = await Promise.all([
                financialApi.getSpendingBudgets(),
                financialApi.getTransactions(),
            ]);
            setBudgets(budgetsRes.results);
            setTransactions(txRes.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load spending habits.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const totalSpentKsh = useMemo(
        () => budgets.reduce((acc, b) => acc + getBudgetSpent(b), 0),
        [budgets]
    );

    const totalCapKsh = useMemo(
        () => budgets.reduce((acc, b) => acc + getBudgetLimit(b), 0),
        [budgets]
    );

    const handleCreateBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        const activeMonthKey = monthKey.trim() || formatNairobiMonthKey();
        if (!category.trim() || !activeMonthKey) return;
        setSubmitting(true);
        setError(null);
        try {
            const capAmount = Math.max(1, Number(limitKsh) || 10000);
            await financialApi.createSpendingBudget({
                category: category.trim(),
                month_key: activeMonthKey,
                monthly_cap_ksh: capAmount,
                monthly_limit_ksh: capAmount,
                spent_ksh: Number(spentKsh) || 0,
                rule_note: ruleNote.trim() || undefined,
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save category cap.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FinancialShell
            subtitle="Monthly budgets, savings targets, investments, and mindful spending habits."
            ctaLabel="Add category cap"
            onCtaClick={() => {
                setCategory('');
                setMonthKey(formatNairobiMonthKey());
                setSpentKsh('0');
                setLimitKsh('25000');
                setRuleNote('');
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
                            <div className="text-xs text-[#707974]">Discretionary Spend</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#006D3E]">
                                {formatKsh(totalSpentKsh)}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Cap: {formatKsh(totalCapKsh)}
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Active Caps</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {budgets.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Category spending budgets</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Remaining Cap</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {formatKsh(Math.max(0, totalCapKsh - totalSpentKsh))}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Unspent allowance</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Logged Entries</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {transactions.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Mindful spending logs</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Category Caps &amp; Budgets
                            </h2>
                            {budgets.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No category spending budgets created yet.
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {budgets.map((b) => {
                                        const limit = Math.max(1, getBudgetLimit(b));
                                        const spent = Math.max(0, getBudgetSpent(b));
                                        const pct = Math.min(100, Math.round((spent / limit) * 100));
                                        const noteText = b.rule_note || b.note;
                                        return (
                                            <div
                                                key={b.id}
                                                className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-[#14221C]">
                                                            {b.category}
                                                        </div>
                                                        <div className="text-xs text-[#707974] mt-0.5">
                                                            {b.month_key ? `${b.month_key} · ` : ''}
                                                            {noteText || 'Monthly category budget'}
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
                                                <div className="mt-2.5 flex items-center justify-between font-mono text-xs text-[#707974]">
                                                    <span>
                                                        {formatKsh(spent)} / {formatKsh(limit)} spent
                                                    </span>
                                                    <span>{formatKsh(Math.max(0, limit - spent))} left</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Mindful Purchase Log
                            </h2>
                            {transactions.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No mindful purchase entries yet.
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
                                                    {tx.tx_date || tx.occurred_at?.slice(0, 10)} · {tx.category}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#006D3E] shrink-0">
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
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Add category cap
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateBudget} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Category
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="e.g., Dining & Coffee"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Month Key (YYYY-MM)
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={monthKey}
                                        onChange={(e) => setMonthKey(e.target.value)}
                                        placeholder="2026-11"
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Monthly Cap (Ksh)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        step="any"
                                        required
                                        value={limitKsh}
                                        onChange={(e) => setLimitKsh(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Spent (Ksh)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={spentKsh}
                                        onChange={(e) => setSpentKsh(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Rule Note (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={ruleNote}
                                        onChange={(e) => setRuleNote(e.target.value)}
                                        placeholder="e.g., Pause impulse orders on weekdays"
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