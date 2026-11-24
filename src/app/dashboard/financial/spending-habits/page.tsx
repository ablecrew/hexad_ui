// src/app/dashboard/financial/spending-habits/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { FinancialShell } from '@/components/financial/FinancialShell';
import { useAuth } from '@/context/AuthContext';
import {
    BudgetRuleItem,
    financialApi,
    formatKsh,
    TransactionItem,
} from '@/lib/financial-api';

export default function SpendingHabitsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [rules, setRules] = useState<BudgetRuleItem[]>([]);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [category, setCategory] = useState('');
    const [spentKsh, setSpentKsh] = useState('0');
    const [limitKsh, setLimitKsh] = useState('25000');
    const [ruleNote, setRuleNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [rulesRes, txRes] = await Promise.all([
                financialApi.getBudgetRules().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                financialApi.getTransactions().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
            ]);
            setRules(rulesRes.results);
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
        () => rules.reduce((acc, r) => acc + (Number(r.spent_ksh) || 0), 0),
        [rules]
    );

    const totalCapKsh = useMemo(
        () => rules.reduce((acc, r) => acc + (Number(r.monthly_limit_ksh) || 0), 0),
        [rules]
    );

    const handleCreateRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!category.trim()) return;
        setSubmitting(true);
        try {
            await financialApi.createBudgetRule({
                category: category.trim(),
                spent_ksh: Number(spentKsh) || 0,
                monthly_limit_ksh: Math.max(1, Number(limitKsh) || 10000),
                rule_note: ruleNote.trim() || undefined,
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save spending rule.');
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
                                {rules.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Category spending rules</div>
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
                                Category Caps &amp; Rules
                            </h2>
                            {rules.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No category spending rules created yet.
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {rules.map((r) => {
                                        const limit = Math.max(1, Number(r.monthly_limit_ksh) || 1);
                                        const spent = Math.max(0, Number(r.spent_ksh) || 0);
                                        const pct = Math.min(100, Math.round((spent / limit) * 100));
                                        return (
                                            <div
                                                key={r.id}
                                                className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-[#14221C]">
                                                            {r.category}
                                                        </div>
                                                        {r.rule_note && (
                                                            <div className="text-xs text-[#707974] mt-0.5">
                                                                {r.rule_note}
                                                            </div>
                                                        )}
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
                                                    {tx.tx_date} · {tx.category}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
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
                        <form onSubmit={handleCreateRule} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Category
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Spent (Ksh)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={spentKsh}
                                        onChange={(e) => setSpentKsh(e.target.value)}
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
                                        required
                                        value={limitKsh}
                                        onChange={(e) => setLimitKsh(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Rule Note (optional)
                                </label>
                                <input
                                    type="text"
                                    value={ruleNote}
                                    onChange={(e) => setRuleNote(e.target.value)}
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