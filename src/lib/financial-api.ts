import { apiFetch } from '@/lib/api-client';
import { FinancialSummary } from '@/lib/dashboard-api';
import { PaginatedResponse, PillarGoal } from '@/types/api';

export interface InvestmentItem {
    id: number;
    asset_name?: string;
    name?: string;
    asset_class?: string;
    investment_type?: string;
    account_type?: string;
    balance_ksh?: string | number;
    current_value_ksh?: string | number;
    institution?: string;
}

export interface TransactionItem {
    id: number;
    account?: number | null;
    title: string;
    category: string;
    amount_ksh: string | number;
    tx_type: 'income' | 'expense' | 'transfer' | string;
    occurred_at: string;
    tx_date?: string;
    note?: string;
}

export function formatNairobiMonthKey(d: Date = new Date()): string {
    return formatNairobiDate(d).slice(0, 7); // "YYYY-MM"
}

export interface SpendingBudgetItem {
    id: number;
    category: string;
    month_key?: string;
    monthly_cap_ksh?: string | number;
    monthly_limit_ksh?: string | number;
    limit_ksh?: string | number;
    spent_ksh?: string | number;
    rule_note?: string;
    note?: string;
}

export interface DebtOrBillItem {
    id: number;
    title?: string;
    name?: string;
    category?: string;
    bill_type?: string;
    amount_ksh?: string | number;
    balance_ksh?: string | number;
    due_date?: string;
    status?: string;
    note?: string;
}

export function formatKsh(val: string | number | null | undefined): string {
    const num = Number(val ?? 0);
    const sign = num < 0 ? '-' : '';
    return `${sign}Ksh ${Math.abs(num).toLocaleString('en-KE', {
        maximumFractionDigits: 0,
    })}`;
}

export function formatNairobiDate(d: Date = new Date()): string {
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Africa/Nairobi',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(d);
        const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
        const month = parts.find((p) => p.type === 'month')?.value ?? '01';
        const day = parts.find((p) => p.type === 'day')?.value ?? '01';
        return `${year}-${month}-${day}`;
    } catch {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

export const financialApi = {
    getSummary: () => apiFetch<FinancialSummary>('/financial/summary/'),

    getInvestments: () =>
        apiFetch<PaginatedResponse<InvestmentItem>>('/financial/investments/').catch(() => ({
            count: 0,
            next: null,
            previous: null,
            results: [],
        })),

    createInvestment: (payload: {
        asset_name: string;
        asset_class: string;
        name?: string;
        investment_type?: string;
        account_type?: string;
        balance_ksh?: number | string;
        current_value_ksh?: number | string;
        institution?: string;
    }) =>
        apiFetch<InvestmentItem>('/financial/investments/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getTransactions: () =>
        apiFetch<PaginatedResponse<TransactionItem>>('/financial/transactions/?ordering=-tx_date').catch(
            () => ({
                count: 0,
                next: null,
                previous: null,
                results: [],
            })
        ),

    createTransaction: (payload: {
        account?: number | null;
        title: string;
        category: string;
        amount_ksh: number | string;
        tx_type: 'income' | 'expense' | 'transfer';
        occurred_at: string;
        tx_date?: string;
        note?: string;
    }) =>
        apiFetch<TransactionItem>('/financial/transactions/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getSpendingBudgets: () =>
        apiFetch<PaginatedResponse<SpendingBudgetItem>>('/financial/spending-budgets/').catch(() => ({
            count: 0,
            next: null,
            previous: null,
            results: [],
        })),

    createSpendingBudget: (payload: {
        category: string;
        month_key: string;
        monthly_cap_ksh: number | string;
        monthly_limit_ksh?: number | string;
        spent_ksh?: number | string;
        rule_note?: string;
    }) =>
        apiFetch<SpendingBudgetItem>('/financial/spending-budgets/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getDebtsAndBills: () =>
        apiFetch<PaginatedResponse<DebtOrBillItem>>('/financial/debts-and-bills/').catch(() => ({
            count: 0,
            next: null,
            previous: null,
            results: [],
        })),

    createDebtOrBill: (payload: {
        title?: string;
        name?: string;
        category?: string;
        bill_type?: string;
        amount_ksh?: number | string;
        balance_ksh?: number | string;
        due_date?: string | null;
        status?: string;
        note?: string;
    }) =>
        apiFetch<DebtOrBillItem>('/financial/debts-and-bills/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getFinancialGoals: () =>
        apiFetch<PaginatedResponse<PillarGoal>>('/core/goals/?pillar_slug=financial'),
};