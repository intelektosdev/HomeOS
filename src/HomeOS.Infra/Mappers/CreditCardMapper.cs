using System;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.DataModels;

namespace HomeOS.Infra.Mappers;

public static class CreditCardMapper
{
    private static readonly Guid DefaultUserId = Guid.Parse("22f4bd46-313d-424a-83b9-0c367ad46c3b");

    public static CreditCardDbModel ToDb(CreditCard domain)
    {
        return new CreditCardDbModel
        {
            Id = domain.Id,
            UserId = DefaultUserId, // TODO: Contexto
            Name = domain.Name,
            ClosingDay = domain.ClosingDay,
            DueDay = domain.DueDay,
            Limit = domain.Limit
        };
    }

    public static CreditCard ToDomain(CreditCardDbModel db)
    {
        return new CreditCard(
            db.Id,
            db.Name,
            db.ClosingDay,
            db.DueDay,
            db.Limit
        );
    }
}
