using HomeOS.Domain.GoalBudgetTypes;
using HomeOS.Infra.DataModels;
using Microsoft.FSharp.Core;

namespace HomeOS.Infra.Mappers;

public static class GoalMapper
{
    public static Goal ToDomain(GoalDataModel model)
    {
        var status = model.Status switch
        {
            0 => GoalStatus.InProgress,
            1 => GoalStatus.Achieved,
            2 => GoalStatus.Paused,
            3 => GoalStatus.Cancelled,
            _ => GoalStatus.InProgress
        };

        return new Goal(
            model.Id,
            model.UserId,
            model.Name,
            model.TargetAmount,
            model.CurrentAmount,
            model.Deadline.HasValue ? FSharpOption<DateTime>.Some(model.Deadline.Value) : FSharpOption<DateTime>.None,
            model.LinkedInvestmentId.HasValue ? FSharpOption<Guid>.Some(model.LinkedInvestmentId.Value) : FSharpOption<Guid>.None,
            status,
            model.CreatedAt
        );
    }

    public static GoalDataModel ToDataModel(Goal domain)
    {
        var status = domain.Status.IsInProgress ? 0 :
                     domain.Status.IsAchieved ? 1 :
                     domain.Status.IsPaused ? 2 : 3;

        return new GoalDataModel
        {
            Id = domain.Id,
            UserId = domain.UserId,
            Name = domain.Name,
            TargetAmount = domain.TargetAmount,
            CurrentAmount = domain.CurrentAmount,
            Deadline = FSharpOption<DateTime>.get_IsSome(domain.Deadline) ? domain.Deadline.Value : null,
            LinkedInvestmentId = FSharpOption<Guid>.get_IsSome(domain.LinkedInvestmentId) ? domain.LinkedInvestmentId.Value : null,
            Status = status,
            CreatedAt = domain.CreatedAt
        };
    }
}
