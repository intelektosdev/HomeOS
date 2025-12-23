using HomeOS.Infra.DataModels;
using HomeOS.Domain.InventoryTypes;

namespace HomeOS.Infra.Mappers;

public static class SupplierMapper
{
    public static Supplier ToDomain(SupplierDbModel db)
    {
        return new Supplier(
            db.Id,
            db.Name,
            string.IsNullOrEmpty(db.Email)
                ? Microsoft.FSharp.Core.FSharpOption<string>.None
                : Microsoft.FSharp.Core.FSharpOption<string>.Some(db.Email),
            string.IsNullOrEmpty(db.Phone)
                ? Microsoft.FSharp.Core.FSharpOption<string>.None
                : Microsoft.FSharp.Core.FSharpOption<string>.Some(db.Phone),
            db.CreatedAt
        );
    }

    public static SupplierDbModel ToDbModel(Supplier supplier, Guid userId)
    {
        return new SupplierDbModel
        {
            Id = supplier.Id,
            UserId = userId,
            Name = supplier.Name,
            Email = Microsoft.FSharp.Core.OptionModule.IsSome(supplier.Email)
                ? supplier.Email.Value
                : null,
            Phone = Microsoft.FSharp.Core.OptionModule.IsSome(supplier.Phone)
                ? supplier.Phone.Value
                : null,
            CreatedAt = supplier.CreatedAt
        };
    }
}
