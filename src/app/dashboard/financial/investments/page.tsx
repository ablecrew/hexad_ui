'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { FinancialShell } from '@/components/financial/FinancialShell';
import { useAuth } from '@/context/AuthContext';
import {
    financialApi,
    formatKsh,
    InvestmentItem,
    TransactionItem,
} from '@/lib/financial-api';

function getHoldingName(item: InvestmentItem): string {
    return item.asset_name || item.name || 'Untitled Holding';
}

function getHoldingBalance(item: InvestmentItem): number {
    return Number(item.balance_ksh ?? item.current_value_ksh ?? 0) || 0;
}

function getHoldingType(item: InvestmentItem): string {
    return item.asset_class || item.investment_type || item.account_type || 'investment';
}

export default function InvestmentsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [holdings, setHoldings] = useState<InvestmentItem[]>([]);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [assetName, setAssetName] = useState('');
    const [assetClass, setAssetClass] = useState('money_market');
    const [balanceKsh, setBalanceKsh] = useState('');
    const [institution, setInstitution] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [invRes, txRes] = await Promise.all([
                financialApi.getInvestments(),
                financialApi.getTransactions(),
            ]);
            setHoldings(invRes.results);
            setTransactions(txRes.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load investments.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const portfolioValueKsh = useMemo(
        () => holdings.reduce((acc, item) => acc + getHoldingBalance(item), 0),
        [holdings]
    );

    const contributions = useMemo(
        () =>
            transactions.filter(
                (t) =>
                    t.category.toLowerCase().includes('invest') ||
                    t.category.toLowerCase().includes('fund') ||
                    t.tx_type === 'transfer'
            ),
        [transactions]
    );

    const handleCreateHolding = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetName.trim() || !assetClass.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            const numericBalance = Number(balanceKsh) || 0;
            const trimmedName = assetName.trim();
            const trimmedClass = assetClass.trim();
            await financialApi.createInvestment({
                asset_name: trimmedName,
                asset_class: trimmedClass,
                name: trimmedName,
                investment_type: trimmedClass,
                account_type: trimmedClass,
                balance_ksh: numericBalance,
                current_value_ksh: numericBalance,
                institution: institution.trim() || undefined,
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save holding.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FinancialShell
            subtitle="Monthly budgets, savings targets, investments, and mindful spending habits."
            ctaLabel="Add holding"
            onCtaClick={() => {
                setAssetName('');
                setAssetClass('money_market');
                setBalanceKsh('');
                setInstitution('');
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
                            <div className="text-xs text-[#707974]">Portfolio Value</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#006D3E]">
                                {formatKsh(portfolioValueKsh)}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Across {holdings.length} holdings
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Contributions Logged</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {contributions.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Recorded allocations</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Total Contributed</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {formatKsh(
                                    contributions.reduce((a, b) => a + (Number(b.amount_ksh) || 0), 0)
                                )}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Cumulative deposits</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Largest Position</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {formatKsh(
                                    holdings.reduce(
                                        (max, item) => Math.max(max, getHoldingBalance(item)),
                                        0
                                    )
                                )}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Top holding balance</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Asset Allocation
                            </h2>
                            {holdings.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No investment holdings added yet.
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {holdings.map((item) => {
                                        const bal = getHoldingBalance(item);
                                        const pct =
                                            portfolioValueKsh > 0
                                                ? Math.min(100, Math.max(0, Math.round((bal / portfolioValueKsh) * 100)))
                                                : 0;
                                        return (
                                            <div
                                                key={item.id}
                                                className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-[#14221C]">
                                                            {getHoldingName(item)}
                                                        </div>
                                                        <div className="text-xs text-[#707974] capitalize mt-0.5">
                                                            {getHoldingType(item)}
                                                            {item.institution ? ` · ${item.institution}` : ''}
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
                                                    {formatKsh(bal)} current balance
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Recent Contributions
                            </h2>
                            {contributions.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No contribution entries recorded yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {contributions.slice(0, 6).map((c) => (
                                        <div
                                            key={c.id}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {c.title}
                                                </div>
                                                <div className="font-mono text-[11px] text-[#707974] mt-0.5">
                                                    {c.tx_date || c.occurred_at?.slice(0, 10)} · {c.category}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#006D3E] shrink-0">
                                                +{formatKsh(c.amount_ksh)}
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
                                Add holding
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateHolding} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Asset / Fund Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={assetName}
                                    onChange={(e) => setAssetName(e.target.value)}
                                    placeholder="e.g., CIC Money Market Fund"
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Asset Class
                                    </label>
                                    <select
                                        value={assetClass}
                                        onChange={(e) => setAssetClass(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    >
                                        <option value="money_market">Money Market</option>
                                        <option value="equity">Equity</option>
                                        <option value="bond">Bond</option>
                                        <option value="etf">ETF</option>
                                        <option value="sacco">SACCO</option>
                                        <option value="real_estate">Real Estate</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Balance (Ksh)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        required
                                        value={balanceKsh}
                                        onChange={(e) => setBalanceKsh(e.target.value)}
                                        placeholder="e.g., 50000"
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Institution (optional)
                                </label>
                                <input
                                    type="text"
                                    value={institution}
                                    onChange={(e) => setInstitution(e.target.value)}
                                    placeholder="e.g., CIC Asset Management"
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