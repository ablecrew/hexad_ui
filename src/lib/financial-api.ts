import { apiFetch } from '@/lib/api-client';
import { FinancialSummary } from '@/lib/dashboard-api';
import { PaginatedResponse, PillarGoal } from '@/types/api';

export interface AccountItem {
    id: number;
    name: string;
    account_type: string;
    balance_ksh: string | number;
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

export interface BudgetRuleItem {
    id: number;
    category: string;
    monthly_limit_ksh: string | number;
    spent_ksh: string | number;
    rule_note?: string;
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

    getAccounts: () =>
        apiFetch<PaginatedResponse<AccountItem>>('/financial/accounts/?ordering=-id'),
    createAccount: (payload: {
        name: string;
        account_type: string;
        balance_ksh: number | string;
        institution?: string;
    }) =>
        apiFetch<AccountItem>('/financial/accounts/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getTransactions: () =>
        apiFetch<PaginatedResponse<TransactionItem>>('/financial/transactions/?ordering=-tx_date'),
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

    getBudgetRules: () =>
        apiFetch<PaginatedResponse<BudgetRuleItem>>('/financial/budget-rules/?ordering=-id'),
    createBudgetRule: (payload: {
        category: string;
        monthly_limit_ksh: number | string;
        spent_ksh: number | string;
        rule_note?: string;
    }) =>
        apiFetch<BudgetRuleItem>('/financial/budget-rules/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getFinancialGoals: () =>
        apiFetch<PaginatedResponse<PillarGoal>>('/core/goals/?pillar_slug=financial'),
};