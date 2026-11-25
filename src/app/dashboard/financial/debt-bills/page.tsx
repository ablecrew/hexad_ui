'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Loader2, Receipt, X } from 'lucide-react';
import { FinancialShell } from '@/components/financial/FinancialShell';
import { useAuth } from '@/context/AuthContext';
import { FinancialSummary } from '@/lib/dashboard-api';
import {
    DebtOrBillItem,
    financialApi,
    formatKsh,
    formatNairobiDate,
    TransactionItem,
} from '@/lib/financial-api';
import { PillarGoal } from '@/types/api';

type EntryKind = 'bill' | 'debt';

function getItemTitle(item: DebtOrBillItem): string {
    return item.title || item.name || 'Untitled Item';
}

function getItemAmount(item: DebtOrBillItem): number {
    return Number(item.balance_ksh ?? item.amount_ksh ?? 0) || 0;
}

function isDebtRecord(item: DebtOrBillItem): boolean {
    const combined = `${item.bill_type ?? ''} ${item.category ?? ''} ${item.title ?? ''} ${item.name ?? ''}`.toLowerCase();
    return (
        combined.includes('debt') ||
        combined.includes('loan') ||
        combined.includes('credit') ||
        combined.includes('mortgage') ||
        combined.includes('liability')
    );
}

export default function DebtBillsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [debtsAndBills, setDebtsAndBills] = useState<DebtOrBillItem[]>([]);
    const [goals, setGoals] = useState<PillarGoal[]>([]);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);

    const [leftTab, setLeftTab] = useState<'debts' | 'goals'>('debts');

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [entryKind, setEntryKind] = useState<EntryKind>('bill');
    const [title, setTitle] = useState('');
    const [amountKsh, setAmountKsh] = useState('');
    const [originalBalanceKsh, setOriginalBalanceKsh] = useState('');
    const [category, setCategory] = useState('Bills');
    const [txDate, setTxDate] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [sumRes, debtsRes, goalsRes, txRes] = await Promise.all([
                financialApi.getSummary().catch(() => null),
                financialApi.getDebtsAndBills(),
                financialApi.getFinancialGoals().catch(() => ({ count: 0, next: null, previous: null, results: [] })),
                financialApi.getTransactions(),
            ]);
            setSummary(sumRes);
            setDebtsAndBills(Array.isArray(debtsRes.results) ? debtsRes.results : []);
            setGoals(Array.isArray(goalsRes.results) ? goalsRes.results : []);
            setTransactions(Array.isArray(txRes.results) ? txRes.results : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load debt & bills.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const debtItems = useMemo(
        () => debtsAndBills.filter((item) => isDebtRecord(item)),
        [debtsAndBills]
    );

    const totalDebtBalanceKsh = useMemo(() => {
        if (debtItems.length > 0) {
            return debtItems.reduce((sum, item) => sum + getItemAmount(item), 0);
        }
        return Number(summary?.total_debts_ksh ?? 0) || 0;
    }, [debtItems, summary]);

    const billItems = useMemo(() => {
        const fromRecords = debtsAndBills
            .filter((item) => !isDebtRecord(item))
            .map((d) => ({
                id: `record-${d.id}`,
                title: getItemTitle(d),
                category: d.category || d.bill_type || 'Bills',
                amount_ksh: getItemAmount(d),
                tx_date: d.due_date || '',
                note: d.note,
            }));

        const fromExpenses = transactions
            .filter((t) => t.tx_type === 'expense')
            .map((t) => ({
                id: `tx-${t.id}`,
                title: t.title,
                category: t.category || 'Bills',
                amount_ksh: Number(t.amount_ksh) || 0,
                tx_date: t.tx_date || t.occurred_at?.slice(0, 10) || '',
                note: t.note,
            }));

        return [...fromRecords, ...fromExpenses];
    }, [debtsAndBills, transactions]);

    const openModalWithKind = (kind: EntryKind) => {
        setEntryKind(kind);
        setTitle('');
        setAmountKsh('');
        setOriginalBalanceKsh('');
        setCategory(kind === 'debt' ? 'Loan / Debt' : 'Bills');
        setTxDate(formatNairobiDate());
        setNote('');
        setModalOpen(true);
    };

    const handleCreateEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            const numericAmount = Math.max(0, Number(amountKsh) || 0);
            const numericOriginal = Math.max(numericAmount, Number(originalBalanceKsh) || numericAmount);
            const dateValue = txDate || formatNairobiDate();
            const trimmedTitle = title.trim();
            const trimmedCategory =
                category.trim() || (entryKind === 'debt' ? 'Loan / Debt' : 'Bills');

            const combinedNote =
                entryKind === 'debt' && numericOriginal > numericAmount
                    ? [note.trim(), `Initial: ${formatKsh(numericOriginal)}`]
                        .filter(Boolean)
                        .join(' · ')
                    : note.trim() || undefined;

            await financialApi.createDebtOrBill({
                title: trimmedTitle,
                name: trimmedTitle,
                category: trimmedCategory,
                bill_type: entryKind,
                amount_ksh: numericAmount.toFixed(2),
                balance_ksh: numericAmount.toFixed(2),
                due_date: dateValue,
                status: entryKind === 'debt' ? 'active' : 'upcoming',
                note: combinedNote,
            });

            if (entryKind === 'bill') {
                await financialApi.createTransaction({
                    title: trimmedTitle,
                    category: trimmedCategory,
                    amount_ksh: numericAmount.toFixed(2),
                    tx_type: 'expense',
                    occurred_at: dateValue,
                    tx_date: dateValue,
                    note: combinedNote,
                });
            }

            setModalOpen(false);
            if (entryKind === 'debt') {
                setLeftTab('debts');
            }
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save entry.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FinancialShell
            subtitle="Monthly budgets, savings targets, investments, and mindful spending habits."
            ctaLabel="Add bill or debt"
            onCtaClick={() => openModalWithKind('bill')}
            error={error}
        >
            {loading ? (
                <div className="mt-14 flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-[#004635]" />
                </div>
            ) : (
                <>
                    {/* Top Summary Cards */}
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Remaining Debt</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#974722]">
                                {formatKsh(totalDebtBalanceKsh)}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Across {debtItems.length} debt {debtItems.length === 1 ? 'account' : 'accounts'}
                            </div>
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
                            <div className="mt-1 text-xs text-[#707974]">Logged bills &amp; expenses</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Payoff &amp; Reserve Goals</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {goals.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Active financial targets</div>
                        </div>
                    </div>

                    {/* Main Split View: Active Debts / Goals (Left) + Upcoming Bills (Right) */}
                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setLeftTab('debts')}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                            leftTab === 'debts'
                                                ? 'bg-[#004635] text-white'
                                                : 'border border-[#BFC9C3] bg-white text-[#14221C] hover:bg-[#ECEEEB]'
                                        }`}
                                    >
                                        <CreditCard className="h-3.5 w-3.5" />
                                        Active Debts ({debtItems.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLeftTab('goals')}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                            leftTab === 'goals'
                                                ? 'bg-[#004635] text-white'
                                                : 'border border-[#BFC9C3] bg-white text-[#14221C] hover:bg-[#ECEEEB]'
                                        }`}
                                    >
                                        Payoff Goals ({goals.length})
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openModalWithKind(leftTab === 'debts' ? 'debt' : 'bill')}
                                    className="text-xs font-medium text-[#004635] hover:underline"
                                >
                                    + Add {leftTab === 'debts' ? 'debt' : 'bill'}
                                </button>
                            </div>

                            {leftTab === 'debts' ? (
                                debtItems.length === 0 ? (
                                    <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                        <p>No active debts or loans recorded yet.</p>
                                        <button
                                            type="button"
                                            onClick={() => openModalWithKind('debt')}
                                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B]"
                                        >
                                            Add first debt
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3.5">
                                        {debtItems.map((debt) => {
                                            const remaining = getItemAmount(debt);
                                            const sharePct =
                                                totalDebtBalanceKsh > 0
                                                    ? Math.min(
                                                        100,
                                                        Math.max(5, Math.round((remaining / totalDebtBalanceKsh) * 100))
                                                    )
                                                    : 0;
                                            return (
                                                <div
                                                    key={debt.id}
                                                    className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-semibold text-[#14221C]">
                                                                    {getItemTitle(debt)}
                                                                </span>
                                                                <span className="rounded-full bg-[#FDF3EE] px-2 py-0.5 font-mono text-[10px] font-medium text-[#974722] capitalize">
                                                                    {debt.status || 'Active debt'}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-[#707974] mt-0.5">
                                                                {debt.category || 'Liability'}
                                                                {debt.due_date ? ` · Due ${debt.due_date}` : ''}
                                                                {debt.note ? ` · ${debt.note}` : ''}
                                                            </div>
                                                        </div>
                                                        <span className="font-mono text-sm font-semibold text-[#974722] shrink-0">
                                                            {formatKsh(remaining)}
                                                        </span>
                                                    </div>

                                                    <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-[#ECEEEB]">
                                                        <div
                                                            className="h-full rounded-full bg-[#974722]"
                                                            style={{ width: `${sharePct}%` }}
                                                        />
                                                    </div>

                                                    <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-[#707974]">
                                                        <span>{sharePct}% of total debt load</span>
                                                        <span>Balance remaining</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            ) : goals.length === 0 ? (
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

                        {/* Right Column: Upcoming Bills */}
                        <div className="lg:col-span-5">
                            <div className="flex items-center justify-between gap-2 mb-3.5">
                                <h2 className="inline-flex items-center gap-2 font-serif text-xl font-semibold text-[#111D18]">
                                    <Receipt className="h-4 w-4 text-[#004635]" />
                                    Upcoming Bills
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => openModalWithKind('bill')}
                                    className="text-xs font-medium text-[#004635] hover:underline"
                                >
                                    + Add bill
                                </button>
                            </div>
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
                                                <div className="font-mono text-[11px] text-[#707974] mt-0.5 truncate">
                                                    {bill.tx_date || 'Scheduled'} · {bill.category}
                                                    {bill.note ? ` · ${bill.note}` : ''}
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

            {/* Add Bill or Debt Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 p-0 sm:p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[#BFC9C3] bg-white p-5 sm:p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                {entryKind === 'debt' ? 'Add debt or loan' : 'Add bill or payment'}
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
                                    Entry Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEntryKind('bill');
                                            if (category === 'Loan / Debt') setCategory('Bills');
                                        }}
                                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                                            entryKind === 'bill'
                                                ? 'border-[#004635] bg-[#004635] text-white'
                                                : 'border-[#BFC9C3] bg-[#F8FAF7] text-[#14221C]'
                                        }`}
                                    >
                                        Bill / Expense
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEntryKind('debt');
                                            if (category === 'Bills') setCategory('Loan / Debt');
                                        }}
                                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                                            entryKind === 'debt'
                                                ? 'border-[#974722] bg-[#974722] text-white'
                                                : 'border-[#BFC9C3] bg-[#F8FAF7] text-[#14221C]'
                                        }`}
                                    >
                                        Debt / Loan
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    {entryKind === 'debt' ? 'Debt / Loan Name' : 'Bill / Liability Name'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={
                                        entryKind === 'debt'
                                            ? 'e.g., HELB / SACCO Loan'
                                            : 'e.g., Monthly Rent or Fiber Internet'
                                    }
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        {entryKind === 'debt' ? 'Remaining Balance (Ksh)' : 'Amount (Ksh)'}
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

                            {entryKind === 'debt' && (
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Original Principal (Ksh, optional)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={originalBalanceKsh}
                                        onChange={(e) => setOriginalBalanceKsh(e.target.value)}
                                        placeholder="Optional context note"
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        {entryKind === 'debt' ? 'Next Due Date' : 'Date'}
                                    </label>
                                    <input
                                        type="date"
                                        value={txDate}
                                        onChange={(e) => setTxDate(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Note (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="e.g., Monthly installment"
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