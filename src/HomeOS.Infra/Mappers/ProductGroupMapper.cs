using HomeOS.Infra.DataModels;
using HomeOS.Domain.InventoryTypes;

namespace HomeOS.Infra.Mappers;

public static class ProductGroupMapper
{
    public static ProductGroup ToDomain(ProductGroupDbModel db)
    {
        return new ProductGroup(
            db.Id,
            db.Name,
            string.IsNullOrEmpty(db.Description)
                ? Microsoft.FSharp.Core.FSharpOption<string>.None
                : Microsoft.FSharp.Core.FSharpOption<string>.Some(db.Description),
            db.CreatedAt
        );
    }

    public static ProductGroupDbModel ToDbModel(ProductGroup group, Guid userId)
    {
        return new ProductGroupDbModel
        {
            Id = group.Id,
            UserId = userId,
            Name = group.Name,
            Description = Microsoft.FSharp.Core.OptionModule.IsSome(group.Description)
                ? group.Description.Value
                : null,
            CreatedAt = group.CreatedAt
        };
    }
}
