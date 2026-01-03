using System;

namespace HomeOS.Infra.DataModels;

public class CreditCardTransactionDbModel
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid CreditCardId { get; set; }
    public Guid CategoryId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public DateTime CreatedAt { get; set; }
    
    public Guid? InstallmentId { get; set; }
    public int? InstallmentNumber { get; set; }
    public int? TotalInstallments { get; set; }
    
    public byte StatusId { get; set; }
    public Guid? BillPaymentId { get; set; }
    
    // Product tracking
    public Guid? ProductId { get; set; }
}
