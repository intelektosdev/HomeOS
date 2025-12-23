using HomeOS.Infra.DataModels;
using HomeOS.Domain.InventoryTypes;

namespace HomeOS.Infra.Mappers;

public static class ShoppingListItemMapper
{
    public static ShoppingListItem ToDomain(ShoppingListItemDbModel db)
    {
        var unit = db.Unit != null
            ? UnitOfMeasureModule.fromString(db.Unit)
            : Microsoft.FSharp.Core.FSharpOption<UnitOfMeasure>.None;

        return new ShoppingListItem(
            db.Id,
            db.ProductId.HasValue
                ? Microsoft.FSharp.Core.FSharpOption<Guid>.Some(db.ProductId.Value)
                : Microsoft.FSharp.Core.FSharpOption<Guid>.None,
            db.Name,
            db.Quantity,
            unit,
            db.EstimatedPrice.HasValue
                ? Microsoft.FSharp.Core.FSharpOption<decimal>.Some(db.EstimatedPrice.Value)
                : Microsoft.FSharp.Core.FSharpOption<decimal>.None,
            db.IsPurchased,
            db.CreatedAt,
            db.PurchasedAt.HasValue
                ? Microsoft.FSharp.Core.FSharpOption<DateTime>.Some(db.PurchasedAt.Value)
                : Microsoft.FSharp.Core.FSharpOption<DateTime>.None
        );
    }

    public static ShoppingListItemDbModel ToDbModel(ShoppingListItem item, Guid userId)
    {
        return new ShoppingListItemDbModel
        {
            Id = item.Id,
            UserId = userId,
            ProductId = Microsoft.FSharp.Core.OptionModule.IsSome(item.ProductId)
                ? item.ProductId.Value
                : null,
            Name = item.Name,
            Quantity = item.Quantity,
            Unit = Microsoft.FSharp.Core.OptionModule.IsSome(item.Unit)
                ? UnitOfMeasureModule.toString(item.Unit.Value)
                : null,
            EstimatedPrice = Microsoft.FSharp.Core.OptionModule.IsSome(item.EstimatedPrice)
                ? item.EstimatedPrice.Value
                : null,
            IsPurchased = item.IsPurchased,
            CreatedAt = item.CreatedAt,
            PurchasedAt = Microsoft.FSharp.Core.OptionModule.IsSome(item.PurchasedAt)
                ? item.PurchasedAt.Value
                : null
        };
    }
}
