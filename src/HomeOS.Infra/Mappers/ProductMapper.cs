using HomeOS.Infra.DataModels;
using HomeOS.Domain.InventoryTypes;

namespace HomeOS.Infra.Mappers;

public static class ProductMapper
{
    public static Product ToDomain(ProductDbModel db)
    {
        var unit = UnitOfMeasureModule.fromString(db.Unit);
        var unitValue = unit != null && Microsoft.FSharp.Core.OptionModule.IsSome(unit)
            ? unit.Value
            : UnitOfMeasure.Unit;

        return new Product(
            db.Id,
            db.Name,
            unitValue,
            db.CategoryId.HasValue
                ? Microsoft.FSharp.Core.FSharpOption<Guid>.Some(db.CategoryId.Value)
                : Microsoft.FSharp.Core.FSharpOption<Guid>.None,
            db.ProductGroupId.HasValue
                ? Microsoft.FSharp.Core.FSharpOption<Guid>.Some(db.ProductGroupId.Value)
                : Microsoft.FSharp.Core.FSharpOption<Guid>.None,
            string.IsNullOrEmpty(db.Barcode)
                ? Microsoft.FSharp.Core.FSharpOption<string>.None
                : Microsoft.FSharp.Core.FSharpOption<string>.Some(db.Barcode),
            db.LastPrice.HasValue
                ? Microsoft.FSharp.Core.FSharpOption<decimal>.Some(db.LastPrice.Value)
                : Microsoft.FSharp.Core.FSharpOption<decimal>.None,
            db.StockQuantity,
            db.MinStockAlert.HasValue
                ? Microsoft.FSharp.Core.FSharpOption<decimal>.Some(db.MinStockAlert.Value)
                : Microsoft.FSharp.Core.FSharpOption<decimal>.None,
            db.IsActive,
            db.CreatedAt
        );
    }

    public static ProductDbModel ToDbModel(Product product, Guid userId)
    {
        return new ProductDbModel
        {
            Id = product.Id,
            UserId = userId,
            Name = product.Name,
            Unit = UnitOfMeasureModule.toString(product.Unit),
            CategoryId = Microsoft.FSharp.Core.OptionModule.IsSome(product.CategoryId)
                ? product.CategoryId.Value
                : null,
            ProductGroupId = Microsoft.FSharp.Core.OptionModule.IsSome(product.ProductGroupId)
                ? product.ProductGroupId.Value
                : null,
            Barcode = Microsoft.FSharp.Core.OptionModule.IsSome(product.Barcode)
                ? product.Barcode.Value
                : null,
            LastPrice = Microsoft.FSharp.Core.OptionModule.IsSome(product.LastPrice)
                ? product.LastPrice.Value
                : null,
            StockQuantity = product.StockQuantity,
            MinStockAlert = Microsoft.FSharp.Core.OptionModule.IsSome(product.MinStockAlert)
                ? product.MinStockAlert.Value
                : null,
            IsActive = product.IsActive,
            CreatedAt = product.CreatedAt
        };
    }
}
