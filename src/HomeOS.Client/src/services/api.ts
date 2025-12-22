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
    PayTransactionRequest
} from '../types';

export const api = axios.create({
    baseURL: 'http://localhost:5050/api', // Ajuste conforme porta real do backend
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
    }
};

export const TransactionsService = {
    getAll: async (start?: string, end?: string) => {
        // start/end format: YYYY-MM-DD
        const response = await api.get<TransactionResponse[]>('/transactions', {
            params: { start, end }
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
