using System;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.DataModels;

namespace HomeOS.Infra.Mappers;

public static class CreditCardPaymentMapper
{
    public static CreditCardPaymentDbModel ToDb(CreditCardPayment domain, Guid userId)
    {
        return new CreditCardPaymentDbModel
        {
            Id = domain.Id,
            UserId = userId,
            CreditCardId = domain.CreditCardId,
            AccountId = domain.AccountId,
            Amount = domain.Amount,
            PaymentDate = domain.PaymentDate,
            ReferenceMonth = domain.ReferenceMonth,
            CreatedAt = DateTime.Now
        };
    }

    public static CreditCardPayment ToDomain(CreditCardPaymentDbModel db)
    {
        return new CreditCardPayment(
            db.Id,
            db.CreditCardId,
            db.AccountId,
            db.Amount,
            db.PaymentDate,
            db.ReferenceMonth
        );
    }
}
