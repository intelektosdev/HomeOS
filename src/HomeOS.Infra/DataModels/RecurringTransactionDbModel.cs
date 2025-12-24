using System;

namespace HomeOS.Infra.DataModels;

public class RecurringTransactionDbModel
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Description { get; set; } = string.Empty;
    public byte Type { get; set; } // 1=Income, 2=Expense
    public Guid CategoryId { get; set; }
    public Guid? AccountId { get; set; }
    public Guid? CreditCardId { get; set; }

    // Amount Type
    public byte AmountTypeId { get; set; } // 1=Fixed, 2=Variable
    public decimal? FixedAmount { get; set; }
    public decimal? AverageAmount { get; set; }

    // Frequency
    public byte FrequencyId { get; set; }
    public int? DayOfMonth { get; set; }

    // Dates
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime NextOccurrence { get; set; }

    // Status
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastGeneratedAt { get; set; }
}

public class GeneratedTransactionDbModel
{
    public Guid TransactionId { get; set; }
    public Guid RecurringTransactionId { get; set; }
    public DateTime GeneratedAt { get; set; }
    public bool WasModified { get; set; }
}
