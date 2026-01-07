import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
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
    AnalyticsSummaryResponse,
    Product,
    ProductGroup,
    Supplier,
    CreateProductRequest,
    UpdateProductRequest,
    ShoppingListItem,
    AddShoppingListItemRequest,
    CheckoutRequest,
    PurchaseItem
} from '../types';

// Hardcoded IP for mobile dev environment to ensure connectivity
// Android Emulator uses 10.0.2.2 to access host machine
// iOS Simulator uses localhost
const API_URL = Platform.OS === 'android'
    ? 'http://192.168.15.13:5055/api'
    : 'http://192.168.15.13:5055/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add authentication interceptor
const TOKEN_KEY = 'auth_token';
let authToken: string | null = null;

export const setAuthToken = async (token: string | null) => {
    authToken = token;
    if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
};

export const loadAuthToken = async () => {
    try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
            authToken = token;
        }
        return token;
    } catch (error) {
        console.error('Error loading auth token:', error);
        return null;
    }
};

export const getAuthToken = () => authToken;

api.interceptors.request.use((config) => {
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
});

// Auth Service
export const AuthService = {
    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            await setAuthToken(response.data.token);
        }
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
    }
};

// ===== INVENTORY SERVICES =====

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

export const DebtsService = {
    getAll: async (onlyActive = false) => {
        // In Mobile, userId comes from context/token ideally, but hardcoding for demo
        const userId = '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        const response = await api.get<import('../types').Debt[]>('/debts', {
            params: { userId, onlyActive }
        });
        return response.data;
    },
    // other methods would follow similar pattern
    getById: async (id: string) => {
        const userId = '22f4bd46-313d-424a-83b9-0c367ad46c3b';
        const response = await api.get<import('../types').Debt>(`/debts/${id}`, {
            params: { userId }
        });
        return response.data;
    },
    // ... simplified for Mobile starter
};

// other services skipped for brevity in Mobile starter, add as needed.
