export type TransactionType = 'Income' | 'Expense';
export type AccountType = 'Checking' | 'Wallet' | 'Investment';
export type TransactionStatus = 'Pending' | 'Paid' | 'Conciliated' | 'Cancelled';

// --- CATEGORIES ---

export interface CreateCategoryRequest {
    name: string;
    type: TransactionType;
    icon?: string;
}

export interface CategoryResponse {
    id: string;
    name: string;
    type: TransactionType;
    icon?: string;
}

// --- ACCOUNTS ---

export interface CreateAccountRequest {
    name: string;
    type: AccountType;
    initialBalance: number;
}

export interface AccountResponse {
    id: string;
    name: string;
    type: AccountType;
    initialBalance: number;
    isActive: boolean;
}

// --- CREDIT CARDS ---

export interface CreateCreditCardRequest {
    name: string;
    closingDay: number;
    dueDay: number;
    limit: number;
}

export interface CreditCardResponse {
    id: string;
    name: string;
    closingDay: number;
    dueDay: number;
    limit: number;
}

// --- TRANSACTIONS ---

export interface CreateTransactionRequest {
    description: string;
    amount: number;
    dueDate: string; // ISO Date String
    categoryId: string;
    accountId?: string;
    creditCardId?: string;
}

export interface UpdateTransactionRequest extends CreateTransactionRequest { }

export interface CancelTransactionRequest {
    reason: string;
}

export interface ConciliateTransactionRequest {
    conciliatedAt?: string; // ISO Date
}

export interface PayTransactionRequest {
    paymentDate?: string; // ISO Date
}

export interface TransactionResponse {
    id: string;
    description: string;
    amount: number;
    status: TransactionStatus;
    dueDate: string; // ISO Date String
    categoryId: string;
    accountId?: string;
    creditCardId?: string;
}
