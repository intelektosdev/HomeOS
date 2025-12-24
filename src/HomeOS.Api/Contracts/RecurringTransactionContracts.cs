using System.ComponentModel.DataAnnotations;

namespace HomeOS.Api.Contracts;

// --- RECURRING TRANSACTIONS ---

public record CreateRecurringTransactionRequest(
    [Required] string Description,
    [Required] string Type, // "Income" or "Expense"
    [Required] Guid CategoryId,
    Guid? AccountId,
    Guid? CreditCardId,
    [Required] string AmountType, // "Fixed" or "Variable"
    [Required] decimal Amount,
    [Required] string Frequency, // "Daily", "Weekly", "Biweekly", "Monthly", "Bimonthly", "Quarterly", "Semiannual", "Annual"
    int? DayOfMonth, // 1-31, null for last day of month
    [Required] DateTime StartDate,
    DateTime? EndDate,
    bool IsActive = true
);

public record UpdateRecurringTransactionRequest(
    [Required] string Description,
    [Required] Guid CategoryId,
    Guid? AccountId,
    Guid? CreditCardId,
    [Required] string AmountType,
    [Required] decimal Amount,
    [Required] string Frequency,
    int? DayOfMonth,
    DateTime? EndDate,
    bool IsActive
);

public record RecurringTransactionResponse(
    Guid Id,
    string Description,
    string Type,
    Guid CategoryId,
    Guid? AccountId,
    Guid? CreditCardId,
    string AmountType,
    decimal Amount,
    string Frequency,
    int? DayOfMonth,
    DateTime StartDate,
    DateTime? EndDate,
    DateTime NextOccurrence,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? LastGeneratedAt
);

public record GeneratePreviewRequest(
    int Count = 12
);

public record PreviewOccurrenceResponse(
    List<DateTime> Occurrences
);
