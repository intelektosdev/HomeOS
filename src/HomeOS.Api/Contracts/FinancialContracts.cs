using System.ComponentModel.DataAnnotations;

namespace HomeOS.Api.Contracts;

// --- CATEGORIES ---

public record CreateCategoryRequest(
    [Required] string Name,
    [Required] string Type, // "Income" or "Expense"
    string? Icon
);

public record CategoryResponse(
    Guid Id,
    string Name,
    string Type,
    string? Icon
);

// --- ACCOUNTS ---

public record CreateAccountRequest(
    [Required] string Name,
    [Required] string Type, // "Checking", "Wallet", "Investment"
    decimal InitialBalance
);

public record AccountResponse(
    Guid Id,
    string Name,
    string Type,
    decimal InitialBalance,
    bool IsActive
);

// --- CREDIT CARDS ---

public record CreateCreditCardRequest(
    string Name,
    int ClosingDay,
    int DueDay,
    decimal Limit
);

public record UpdateCreditCardRequest(
    string Name,
    int ClosingDay,
    int DueDay,
    decimal Limit
);

public record CreditCardResponse(
    Guid Id,
    string Name,
    int ClosingDay,
    int DueDay,
    decimal Limit
);

// --- CREDIT CARD BILL PAYMENT ---

public record CreditCardBalanceResponse(
    Guid Id,
    string Name,
    decimal Limit,
    decimal UsedLimit,
    decimal AvailableLimit,
    int PendingTransactionsCount
);

public record PayBillRequest(
    Guid AccountId,
    int ReferenceMonth, // YYYYMM format
    Guid[] TransactionIds
);

public record PayBillResponse(
    Guid BillPaymentId,
    decimal Amount,
    int TransactionsCount
);

// --- ANALYTICS ---

public record AnalyticsSummaryResponse(
    decimal TotalIncome,
    decimal TotalExpense,
    decimal Balance,
    int PendingCount,
    List<GroupedDataResponse> Groups
);

public record GroupedDataResponse(
    string Key,
    string Label,
    decimal Income,
    decimal Expense,
    int Count
);


