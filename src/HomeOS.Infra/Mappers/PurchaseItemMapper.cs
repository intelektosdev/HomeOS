using HomeOS.Infra.DataModels;
using HomeOS.Domain.InventoryTypes;

namespace HomeOS.Infra.Mappers;

public static class PurchaseItemMapper
{
    public static PurchaseItem ToDomain(PurchaseItemDbModel db)
    {
        return new PurchaseItem(
            db.Id,
            db.ProductId,
            db.TransactionId,
            db.SupplierId.HasValue
                ? Microsoft.FSharp.Core.FSharpOption<Guid>.Some(db.SupplierId.Value)
                : Microsoft.FSharp.Core.FSharpOption<Guid>.None,
            db.Quantity,
            db.UnitPrice,
            db.PurchaseDate
        );
    }

    public static PurchaseItemDbModel ToDbModel(PurchaseItem item, Guid userId)
    {
        return new PurchaseItemDbModel
        {
            Id = item.Id,
            UserId = userId,
            ProductId = item.ProductId,
            TransactionId = item.TransactionId,
            SupplierId = Microsoft.FSharp.Core.OptionModule.IsSome(item.SupplierId)
                ? item.SupplierId.Value
                : null,
            Quantity = item.Quantity,
            UnitPrice = item.UnitPrice,
            TotalPrice = item.Quantity * item.UnitPrice,
            PurchaseDate = item.PurchaseDate
        };
    }
}
