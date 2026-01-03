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

export interface CreditCardBalanceResponse {
    id: string;
    name: string;
    limit: number;
    usedLimit: number;
    availableLimit: number;
    pendingTransactionsCount: number;
}

export interface PendingTransaction {
    id: string;
    description: string;
    amount: number;
    dueDate: string;
    categoryId: string;
    status: string;
    installmentNumber?: number;
    totalInstallments?: number;
}

export interface PayBillRequest {
    accountId: string;
    referenceMonth: string; // YYYYMM format
    amount: number;
    paymentDate: string; // ISO format
    categoryId?: string;
    transactionIds: string[];
}

export interface PayBillResponse {
    billPaymentId: string;
    amount: number;
    transactionsCount: number;
}

export interface CreditCardPaymentResponse {
    id: string;
    amount: number;
    paymentDate: string;
    referenceMonth: number;
}

// --- TRANSACTIONS ---

export interface CreateTransactionRequest {
    description: string;
    amount: number;
    dueDate: string; // ISO Date String
    categoryId: string;
    accountId?: string;
    creditCardId?: string;
    installmentCount?: number;
    productId?: string;
}

export interface CreateCreditCardTransactionRequest {
    creditCardId: string;
    categoryId: string;
    description: string;
    amount: number;
    transactionDate: string;
    installments?: number;
    productId?: string;
}

export interface CreditCardTransactionResponse {
    id: string;
    description: string;
    amount: number;
    transactionDate: string;
    categoryId: string;
    status: string;
    installmentId?: string;
    installmentNumber?: number;
    totalInstallments?: number;
    billPaymentId?: string;
    productId?: string;
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
    installmentId?: string;
    installmentNumber?: number;
    totalInstallments?: number;
    productId?: string;
}

// --- ANALYTICS ---

export interface AnalyticsSummaryResponse {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    pendingCount: number;
    groups: GroupedDataResponse[];
}

export interface GroupedDataResponse {
    key: string;
    label: string;
    income: number;
    expense: number;
    count: number;
}

// --- RECURRING TRANSACTIONS ---

export type RecurrenceFrequency = 'Daily' | 'Weekly' | 'Biweekly' | 'Monthly' | 'Bimonthly' | 'Quarterly' | 'Semiannual' | 'Annual';
export type AmountType = 'Fixed' | 'Variable';

export interface CreateRecurringTransactionRequest {
    description: string;
    type: TransactionType;
    categoryId: string;
    accountId?: string;
    creditCardId?: string;
    amountType: AmountType;
    amount: number;
    frequency: RecurrenceFrequency;
    dayOfMonth?: number;
    startDate: string; // ISO Date
    endDate?: string; // ISO Date
    isActive?: boolean;
}

export interface UpdateRecurringTransactionRequest {
    description: string;
    categoryId: string;
    accountId?: string;
    creditCardId?: string;
    amountType: AmountType;
    amount: number;
    frequency: RecurrenceFrequency;
    dayOfMonth?: number;
    endDate?: string;
    isActive: boolean;
}

export interface RecurringTransactionResponse {
    id: string;
    description: string;
    type: TransactionType;
    categoryId: string;
    accountId?: string;
    creditCardId?: string;
    amountType: AmountType;
    amount: number;
    frequency: RecurrenceFrequency;
    dayOfMonth?: number;
    startDate: string;
    endDate?: string;
    nextOccurrence: string;
    isActive: boolean;
    createdAt: string;
    lastGeneratedAt?: string;
}

// --- DEBTS ---

export interface DebtStatistics {
    totalDebt: number;
    activeDebtCount: number;
}

// --- INVESTMENTS ---

export interface PortfolioSummary {
    summary: {
        TotalInvestments: number;
        TotalInvested: number;
        CurrentValue: number;
        TotalReturn: number;
    };
    byType: Array<{
        InvestmentType: string;
        Count: number;
        TotalInvested: number;
        CurrentValue: number;
        TotalReturn: number;
    }>;
}
// --- CASH FLOW ---

export interface CashFlowDataPoint {
    date: string;
    balance: number;
    incoming: number;
    outgoing: number;
    description: string;
}

export interface CashFlowForecastResponse {
    startingBalance: number;
    dataPoints: CashFlowDataPoint[];
}
