using System;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.DataModels;
using Microsoft.FSharp.Core;

namespace HomeOS.Infra.Mappers;

public static class CategoryMapper
{
    private static readonly Guid DefaultUserId = Guid.Parse("22f4bd46-313d-424a-83b9-0c367ad46c3b");

    public static CategoryDbModel ToDb(Category domain)
    {
        return new CategoryDbModel
        {
            Id = domain.Id,
            UserId = DefaultUserId, // TODO: Obter do contexto
            Name = domain.Name,
            Type = domain.Type.IsIncome ? (byte)1 : (byte)2,
            Icon = OptionModule.IsSome(domain.Icon) ? domain.Icon.Value : null
        };
    }

    public static Category ToDomain(CategoryDbModel db)
    {
        var type = db.Type == 1 ? TransactionType.Income : TransactionType.Expense;
        var icon = db.Icon != null ? FSharpOption<string>.Some(db.Icon) : FSharpOption<string>.None;

        return new Category(
            db.Id,
            db.Name,
            type,
            icon
        );
    }
}
