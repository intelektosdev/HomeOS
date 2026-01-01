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
    referenceMonth: number;
    transactionIds: string[];
}

export interface PayBillResponse {
    billPaymentId: string;
    amount: number;
    transactionsCount: number;
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

// --- INVENTORY ---

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

// --- DEBT INTERFACES ADDED ---
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

// --- INVESTMENT INTERFACES ADDED ---
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

// --- BUDGET INTERFACES ADDED ---
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

// --- GOAL INTERFACES ADDED ---
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
