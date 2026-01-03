using System;

namespace HomeOS.Infra.DataModels;

// Esta classe serve apenas para o Dapper preencher os dados vindos do SQL.
public class TransactionDbModel
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public byte Type { get; set; }
    public Guid CategoryId { get; set; }
    public Guid? AccountId { get; set; }
    public Guid? CreditCardId { get; set; }
    public Guid? BillPaymentId { get; set; } // FK to CreditCardPayments
    public Guid? InstallmentId { get; set; }
    public int? InstallmentNumber { get; set; }
    public int? TotalInstallments { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime CreatedAt { get; set; }

    // Mapeamento dos Status (Flattening)
    public byte StatusId { get; set; }
    public DateTime? PaymentDate { get; set; }
    public string? CancellationReason { get; set; }
    
    // Product tracking
    public Guid? ProductId { get; set; }
}