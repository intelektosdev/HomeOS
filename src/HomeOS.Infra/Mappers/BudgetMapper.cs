using HomeOS.Domain.GoalBudgetTypes;
using HomeOS.Infra.DataModels;
using Microsoft.FSharp.Core;

namespace HomeOS.Infra.Mappers;

public static class BudgetMapper
{
    public static Budget ToDomain(BudgetDataModel model)
    {
        var period = model.PeriodType switch
        {
            0 => BudgetPeriod.Monthly,
            1 => BudgetPeriod.Yearly,
            _ => BudgetPeriod.Monthly // Default ou tratar Custom se tiver campos no banco
        };

        var scope = model.CategoryId.HasValue
            ? BudgetScope.NewCategory(model.CategoryId.Value)
            : BudgetScope.Global;

        return new Budget(
            model.Id,
            model.UserId,
            model.Name,
            model.AmountLimit,
            period,
            scope,
            model.AlertThreshold,
            model.CreatedAt
        );
    }

    public static BudgetDataModel ToDataModel(Budget domain)
    {
        var periodType = domain.Period.IsMonthly ? 0 : (domain.Period.IsYearly ? 1 : 2);

        Guid? categoryId = null;
        if (domain.Scope.IsCategory)
        {
            categoryId = ((BudgetScope.Category)domain.Scope).categoryId;
        }

        return new BudgetDataModel
        {
            Id = domain.Id,
            UserId = domain.UserId,
            Name = domain.Name,
            AmountLimit = domain.AmountLimit,
            PeriodType = periodType,
            CategoryId = categoryId,
            AlertThreshold = domain.AlertThreshold,
            CreatedAt = domain.CreatedAt
        };
    }
}
