import axios from 'axios';
import type {
    AccountResponse,
    CategoryResponse,
    CreateAccountRequest,
    CreateCategoryRequest,
    CreateCreditCardRequest,
    CreateTransactionRequest,
    CreditCardResponse,
    TransactionResponse,
    UpdateTransactionRequest,
    CancelTransactionRequest,
    ConciliateTransactionRequest,
    PayTransactionRequest,
    CreditCardBalanceResponse,
    PendingTransaction,
    PayBillRequest,
    PayBillResponse,
    DebtStatistics,
    PortfolioSummary,
    CashFlowForecastResponse,
    AnalyticsSummaryResponse
} from '../types';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5050/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add authentication interceptor
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth Service
export const AuthService = {
    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },
    register: async (email: string, password: string, name: string) => {
        const response = await api.post('/auth/register', { email, password, name });
        return response.data;
    },
    getCurrentUser: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    }
};

export const CategoriesService = {
    getAll: async () => {
        const response = await api.get<CategoryResponse[]>('/categories');
        return response.data;
    },
    create: async (data: CreateCategoryRequest) => {
        const response = await api.post<CategoryResponse>('/categories', data);
        return response.data;
    },
    update: async (id: string, data: CreateCategoryRequest) => {
        const response = await api.put<CategoryResponse>(`/categories/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/categories/${id}`);
    }
};

export const AccountsService = {
    getAll: async () => {
        const response = await api.get<AccountResponse[]>('/accounts');
        return response.data;
    },
    create: async (data: CreateAccountRequest) => {
        const response = await api.post<AccountResponse>('/accounts', data);
        return response.data;
    },
    update: async (id: string, data: CreateAccountRequest) => {
        const response = await api.put<AccountResponse>(`/accounts/${id}`, data);
        return response.data;
    },
    toggleStatus: async (id: string) => {
        const response = await api.patch<AccountResponse>(`/accounts/${id}/toggle-status`);
        return response.data;
    }
};

export const CreditCardsService = {
    getAll: async () => {
        const response = await api.get<CreditCardResponse[]>('/credit-cards');
        return response.data;
    },
    create: async (data: CreateCreditCardRequest) => {
        const response = await api.post<CreditCardResponse>('/credit-cards', data);
        return response.data;
    },
    update: async (id: string, data: CreateCreditCardRequest) => {
        const response = await api.put<CreditCardResponse>(`/credit-cards/${id}`, data);
        return response.data;
    },
    getBalance: async (id: string) => {
        const response = await api.get<CreditCardBalanceResponse>(`/credit-cards/${id}/balance`);
        return response.data;
    },
    getPendingTransactions: async (id: string) => {
        const response = await api.get<PendingTransaction[]>(`/credit-cards/${id}/pending-transactions`);
        return response.data;
    },
    payBill: async (id: string, data: PayBillRequest) => {
        const response = await api.post<PayBillResponse>(`/credit-cards/${id}/pay-bill`, data);
        return response.data;
    }
};

export const TransactionsService = {
    getAll: async (start?: string, end?: string, categoryId?: string, accountId?: string) => {
        // start/end format: YYYY-MM-DD
        const response = await api.get<TransactionResponse[]>('/transactions', {
            params: { start, end, categoryId, accountId }
        });
        return response.data;
    },
    create: async (data: CreateTransactionRequest) => {
        const response = await api.post<TransactionResponse>('/transactions', data);
        return response.data;
    },
    update: async (id: string, data: UpdateTransactionRequest) => {
        const response = await api.put<TransactionResponse>(`/transactions/${id}`, data);
        return response.data;
    },
    cancel: async (id: string, reason: string) => {
        const data: CancelTransactionRequest = { reason };
        const response = await api.post<TransactionResponse>(`/transactions/${id}/cancel`, data);
        return response.data;
    },
    pay: async (id: string, date?: string) => {
        const data: PayTransactionRequest = { paymentDate: date };
        const response = await api.post<TransactionResponse>(`/transactions/${id}/pay`, data);
        return response.data;
    },
    conciliate: async (id: string, date?: string) => {
        const data: ConciliateTransactionRequest = { conciliatedAt: date };
        const response = await api.post<TransactionResponse>(`/transactions/${id}/conciliate`, data);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/transactions/${id}`);
    }
};

// ===== INVENTORY SERVICES =====

export interface Product {
    id: string;
    name: string;
    unit: string;
    categoryId?: string;
    productGroupId?: string;
    barcode?: string;
    lastPrice?: number;
    stockQuantity: number;
    minStockAlert?: number;
    isActive: boolean;
    createdAt: string;
}

export interface ProductGroup {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
}

export interface Supplier {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    createdAt: string;
}

export interface CreateProductRequest {
    name: string;
    unit: string;
    categoryId?: string;
    productGroupId?: string;
    barcode?: string;
    minStockAlert?: number;
}

export interface UpdateProductRequest {
    name: string;
    unit: string;
    categoryId?: string;
    productGroupId?: string;
    barcode?: string;
    minStockAlert?: number;
    isActive: boolean;
}

export interface ShoppingListItem {
    id: string;
    productId?: string;
    name: string;
    quantity: number;
    unit?: string;
    estimatedPrice?: number;
    isPurchased: boolean;
    createdAt: string;
}

export interface AddShoppingListItemRequest {
    productId?: string;
    name?: string;
    quantity: number;
    unit?: string;
}

export interface CheckoutItemRequest {
    productId?: string;
    name?: string;
    unit?: string;
    shoppingListItemId?: string;
    quantity: number;
    unitPrice: number;
}

export interface CheckoutRequest {
    items: CheckoutItemRequest[];
    categoryId: string;
    accountId?: string;
    creditCardId?: string;
    supplierId?: string;
    purchaseDate: string;
    description?: string;
    installmentCount?: number;
}

export interface PurchaseItem {
    id: string;
    productId: string;
    productName: string;
    transactionId: string;
    supplierId?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    purchaseDate: string;
}

export const ProductsService = {
    getAll: async (includeInactive = false) => {
        const response = await api.get<Product[]>('/product', {
            params: { includeInactive }
        });
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<Product>(`/product/${id}`);
        return response.data;
    },
    getLowStock: async () => {
        const response = await api.get<Product[]>('/product/low-stock');
        return response.data;
    },
    create: async (data: CreateProductRequest) => {
        const response = await api.post<{ id: string }>('/product', data);
        return response.data;
    },
    update: async (id: string, data: UpdateProductRequest) => {
        await api.put(`/product/${id}`, data);
    },
    adjustStock: async (id: string, quantityChange: number) => {
        await api.patch(`/product/${id}/stock`, { quantityChange });
    },
    toggle: async (id: string) => {
        await api.patch(`/product/${id}/toggle`);
    }
};

export const ProductGroupsService = {
    getAll: async () => {
        const response = await api.get<ProductGroup[]>('/product-groups');
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<ProductGroup>(`/product-groups/${id}`);
        return response.data;
    },
    create: async (data: { name: string; description?: string }) => {
        const response = await api.post<{ id: string }>('/product-groups', data);
        return response.data;
    },
    update: async (id: string, data: { name: string; description?: string }) => {
        await api.put(`/product-groups/${id}`, data);
    }
};

export const SuppliersService = {
    getAll: async () => {
        const response = await api.get<Supplier[]>('/suppliers');
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<Supplier>(`/suppliers/${id}`);
        return response.data;
    },
    create: async (data: { name: string; email?: string; phone?: string }) => {
        const response = await api.post<{ id: string }>('/suppliers', data);
        return response.data;
    },
    update: async (id: string, data: { name: string; email?: string; phone?: string }) => {
        await api.put(`/suppliers/${id}`, data);
    }
};

export const ShoppingListService = {
    getPending: async () => {
        const response = await api.get<ShoppingListItem[]>('/shopping-list');
        return response.data;
    },
    addItem: async (data: AddShoppingListItemRequest) => {
        const response = await api.post<{ id: string }>('/shopping-list', data);
        return response.data;
    },
    removeItem: async (id: string) => {
        await api.delete(`/shopping-list/${id}`);
    },
    markAsPurchased: async (id: string) => {
        await api.patch(`/shopping-list/${id}/purchased`);
    },
    checkout: async (data: CheckoutRequest) => {
        const response = await api.post<{ transactionId: string; total: number; itemCount: number }>('/shopping-list/checkout', data);
        return response.data;
    },
    clearPurchased: async () => {
        await api.delete('/shopping-list/clear-purchased');
    }
};

export const PurchasesService = {
    getByTransaction: async (transactionId: string) => {
        const response = await api.get<PurchaseItem[]>(`/purchase/by-transaction/${transactionId}`);
        return response.data;
    },
    getByProduct: async (productId: string, limit = 10) => {
        const response = await api.get<PurchaseItem[]>(`/purchase/by-product/${productId}`, {
            params: { limit }
        });
        return response.data;
    },
    getHistory: async (from?: string, to?: string) => {
        const response = await api.get<PurchaseItem[]>('/purchase/history', {
            params: { from, to }
        });
        return response.data;
    }
};

export const AnalyticsService = {
    getSummary: async (startDate: string, endDate: string, groupBy: string = 'category') => {
        const response = await api.get<AnalyticsSummaryResponse>('/analytics/summary', {
            params: { startDate, endDate, groupBy }
        });
        return response.data;
    }
};

export const CashFlowService = {
    getForecast: async (months: number = 6) => {
        const response = await api.get<CashFlowForecastResponse>('/cash-flow/forecast', {
            params: { months }
        });
        return response.data;
    }
};

export const RecurringTransactionsService = {
    getAll: async (includeInactive = false) => {
        const response = await api.get<import('../types').RecurringTransactionResponse[]>('/recurring-transactions', {
            params: { includeInactive }
        });
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<import('../types').RecurringTransactionResponse>(`/recurring-transactions/${id}`);
        return response.data;
    },
    create: async (data: import('../types').CreateRecurringTransactionRequest) => {
        const response = await api.post<import('../types').RecurringTransactionResponse>('/recurring-transactions', data);
        return response.data;
    },
    update: async (id: string, data: import('../types').UpdateRecurringTransactionRequest) => {
        const response = await api.put<import('../types').RecurringTransactionResponse>(`/recurring-transactions/${id}`, data);
        return response.data;
    },
    toggle: async (id: string) => {
        const response = await api.patch<import('../types').RecurringTransactionResponse>(`/recurring-transactions/${id}/toggle`);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/recurring-transactions/${id}`);
    },
    preview: async (id: string, count = 12) => {
        const response = await api.post<{ occurrences: string[] }>(`/recurring-transactions/${id}/preview`, { count });
        return response.data.occurrences;
    },
    generateAll: async (daysAhead = 30) => {
        const response = await api.post<{ generatedCount: number; targetDate: string }>('/recurring-transactions/generate', null, {
            params: { daysAhead }
        });
        return response.data;
    }
};


// ===== DEBT SERVICES =====

export interface Debt {
    id: string;
    userId: string;
    name: string;
    category: string;
    creditor: string;
    originalAmount: number;
    currentBalance: number;
    interestType: string;
    amortizationType: string;
    startDate: string;
    totalInstallments: number;
    installmentsPaid: number;
    status: string;
    linkedAccountId?: string;
    notes?: string;
}

export interface DebtInstallment {
    id: string;
    debtId: string;
    installmentNumber: number;
    dueDate: string;
    paidDate?: string;
    totalAmount: number;
    principalAmount: number;
    interestAmount: number;
    remainingBalance: number;
    transactionId?: string;
}

export interface CreateDebtRequest {
    userId: string;
    name: string;
    category: string;
    creditor: string;
    amount: number;
    interestIsFixed: boolean;
    monthlyRate: number;
    interestIndexer?: string;
    amortizationType: string;
    totalInstallments: number;
    startDate: string;
    generateSchedule?: boolean;
}

export interface UpdateDebtRequest {
    userId: string;
    name: string;
    creditor: string;
    linkedAccountId?: string;
    notes?: string;
}

export interface PayInstallmentRequest {
    userId: string;
    installmentNumber: number;
    paymentDate: string;
    amountPaid: number;
    transactionId?: string;
}

// DebtStatistics interface removed (imported from types)

export const DebtsService = {
    getAll: async (onlyActive = false) => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        const response = await api.get<Debt[]>('/debts', {
            params: { userId, onlyActive }
        });
        return response.data;
    },
    getById: async (id: string) => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        const response = await api.get<Debt>(`/debts/${id}`, {
            params: { userId }
        });
        return response.data;
    },
    create: async (data: CreateDebtRequest) => {
        const response = await api.post<Debt>('/debts', data);
        return response.data;
    },
    update: async (id: string, data: UpdateDebtRequest) => {
        const response = await api.put<Debt>(`/debts/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        await api.delete(`/debts/${id}`, {
            params: { userId }
        });
    },
    getAmortizationSchedule: async (id: string) => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        const response = await api.get<DebtInstallment[]>(`/debts/${id}/amortization-schedule`, {
            params: { userId }
        });
        return response.data;
    },
    payInstallment: async (id: string, data: PayInstallmentRequest) => {
        const response = await api.post<Debt>(`/debts/${id}/pay-installment`, data);
        return response.data;
    },
    getStatistics: async () => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        const response = await api.get<DebtStatistics>('/debts/statistics', {
            params: { userId }
        });
        return response.data;
    }
};

// ===== INVESTMENT SERVICES =====

export interface Investment {
    id: string;
    userId: string;
    name: string;
    type: string;
    initialAmount: number;
    currentQuantity: number;
    averagePrice: number;
    currentPrice: number;
    investmentDate: string;
    maturityDate?: string;
    annualYield?: number;
    status: string;
    linkedAccountId?: string;
    notes?: string;
}

export interface InvestmentTransaction {
    id: string;
    investmentId: string;
    type: string;
    date: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    fees: number;
    financialTransactionId?: string;
}

export interface CreateInvestmentRequest {
    userId: string;
    name: string;
    type: string;
    ticker?: string;
    fixedIncomeSubType?: string;
    bank?: string;
    title?: string;
    property?: string;
    symbol?: string;
    description?: string;
    initialAmount: number;
    quantity: number;
    unitPrice: number;
    investmentDate: string;
    maturityDate?: string;
    annualYield?: number;
    linkedAccountId?: string;
}

export interface UpdateInvestmentRequest {
    userId: string;
    name: string;
    currentPrice: number;
    annualYield?: number;
    linkedAccountId?: string;
    notes?: string;
}

export interface BuySellRequest {
    userId: string;
    quantity: number;
    unitPrice: number;
    date: string;
    fees?: number;
}

export interface DividendRequest {
    userId: string;
    amount: number;
    date: string;
    description?: string;
}

export interface InvestmentPerformance {
    currentValue: number;
    totalReturn: number;
    returnPercentage: number;
    annualizedReturn: number;
    daysInvested: number;
}

// PortfolioSummary interface removed (imported from types)

export const InvestmentsService = {
    getAll: async (onlyActive = false) => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        const response = await api.get<Investment[]>('/investments', {
            params: { userId, onlyActive }
        });
        return response.data;
    },
    getById: async (id: string) => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        const response = await api.get<Investment>(`/investments/${id}`, {
            params: { userId }
        });
        return response.data;
    },
    create: async (data: CreateInvestmentRequest) => {
        const response = await api.post<Investment>('/investments', data);
        return response.data;
    },
    update: async (id: string, data: UpdateInvestmentRequest) => {
        const response = await api.put<Investment>(`/investments/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        await api.delete(`/investments/${id}`, {
            params: { userId }
        });
    },
    buy: async (id: string, data: BuySellRequest) => {
        const response = await api.post<Investment>(`/investments/${id}/buy`, data);
        return response.data;
    },
    sell: async (id: string, data: BuySellRequest) => {
        const response = await api.post<Investment>(`/investments/${id}/sell`, data);
        return response.data;
    },
    registerDividend: async (id: string, data: DividendRequest) => {
        const response = await api.post(`/investments/${id}/dividends`, data);
        return response.data;
    },
    getTransactions: async (id: string) => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        const response = await api.get<InvestmentTransaction[]>(`/investments/${id}/transactions`, {
            params: { userId }
        });
        return response.data;
    },
    getPerformance: async (id: string) => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        const response = await api.get<InvestmentPerformance>(`/investments/${id}/performance`, {
            params: { userId }
        });
        return response.data;
    },
    getPortfolio: async () => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        const response = await api.get<PortfolioSummary>('/investments/portfolio', {
            params: { userId }
        });
        return response.data;
    }
};

// ===== BUDGET SERVICES =====

export interface Budget {
    id: string;
    userId: string;
    name: string;
    amountLimit: number;
    periodType: string;
    categoryId?: string;
    alertThreshold: number;
}

export interface BudgetStatus {
    budget: Budget;
    spentAmount: number;
    remainingAmount: number;
    percentageUsed: number;
    statusLevel: 'Normal' | 'Warning' | 'Critical';
}

export interface CreateBudgetRequest {
    userId: string;
    name: string;
    amountLimit: number;
    periodType: string;
    categoryId?: string;
    alertThreshold?: number;
}

export interface UpdateBudgetRequest {
    userId: string;
    name: string;
    amountLimit: number;
    alertThreshold?: number;
}

export const BudgetsService = {
    getAll: async () => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        const response = await api.get<BudgetResponse[]>('/budgets', {
            params: { userId }
        });
        return response.data;
    },
    getStatus: async (month?: number, year?: number) => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        const response = await api.get<BudgetStatusResponse[]>('/budgets/status', {
            params: { userId, month, year }
        });
        return response.data;
    },
    create: async (data: CreateBudgetRequest) => {
        const response = await api.post<BudgetResponse>('/budgets', data);
        return response.data;
    },
    update: async (id: string, data: UpdateBudgetRequest) => {
        const response = await api.put<BudgetResponse>(`/budgets/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        await api.delete(`/budgets/${id}`, {
            params: { userId }
        });
    }
};

// Response Types for Budgets matching C# records
export type BudgetResponse = Budget;
export type BudgetStatusResponse = BudgetStatus;

// ===== GOAL SERVICES =====

export interface Goal {
    id: string;
    userId: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    status: string;
    linkedInvestmentId?: string;
}

export interface CreateGoalRequest {
    userId: string;
    name: string;
    targetAmount: number;
    deadline?: string;
    linkedInvestmentId?: string;
}

export interface DepositGoalRequest {
    userId: string;
    amount: number;
    isIncremental?: boolean;
}

export const GoalsService = {
    getAll: async () => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        const response = await api.get<GoalResponse[]>('/goals', {
            params: { userId }
        });
        return response.data;
    },
    create: async (data: CreateGoalRequest) => {
        const response = await api.post<GoalResponse>('/goals', data);
        return response.data;
    },
    deposit: async (id: string, data: DepositGoalRequest) => {
        const response = await api.post<GoalResponse>(`/goals/${id}/deposit`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const userId = localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        await api.delete(`/goals/${id}`, {
            params: { userId }
        });
    }
};

export type GoalResponse = Goal;


