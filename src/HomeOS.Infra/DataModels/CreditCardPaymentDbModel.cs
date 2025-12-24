using System;

namespace HomeOS.Infra.DataModels;

public class CreditCardPaymentDbModel
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid CreditCardId { get; set; }
    public Guid AccountId { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public int ReferenceMonth { get; set; } // YYYYMM format
    public DateTime CreatedAt { get; set; }
}
