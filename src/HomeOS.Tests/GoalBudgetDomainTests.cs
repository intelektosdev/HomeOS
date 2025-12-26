using FluentAssertions;
using HomeOS.Domain.GoalBudgetTypes;
using Microsoft.FSharp.Core;

namespace HomeOS.Tests;

public class GoalBudgetDomainTests
{
    private readonly Guid _userId = Guid.NewGuid();

    [Fact]
    public void CreateBudget_ShouldReturnOk_WhenDataIsValid()
    {
        // Arrange
        var name = "Alimentação";
        var limit = 1000m;
        var period = BudgetPeriod.Monthly;
        var scope = BudgetScope.Global;
        var threshold = 0.8m;

        // Act
        var result = BudgetModule.create(_userId, name, limit, period, scope, threshold);

        // Assert
        result.IsOk.Should().BeTrue();
        var budget = result.ResultValue;
        budget.Name.Should().Be(name);
        budget.AmountLimit.Should().Be(limit);
        budget.AlertThreshold.Should().Be(threshold);
    }

    [Fact]
    public void CreateBudget_ShouldFail_WhenAmountIsZeroOrNegative()
    {
        // Act & Assert
        var resultZero = BudgetModule.create(_userId, "Test", 0m, BudgetPeriod.Monthly, BudgetScope.Global, 0.8m);
        resultZero.IsError.Should().BeTrue();
        resultZero.ErrorValue.IsAmountMustBePositive.Should().BeTrue();

        var resultNeg = BudgetModule.create(_userId, "Test", -10m, BudgetPeriod.Monthly, BudgetScope.Global, 0.8m);
        resultNeg.IsError.Should().BeTrue();
    }

    [Fact]
    public void CreateGoal_ShouldReturnOk_WhenDataIsValid()
    {
        // Arrange
        var name = "Viagem";
        var target = 5000m;

        // Act
        var result = GoalModule.create(_userId, name, target, FSharpOption<DateTime>.None, FSharpOption<Guid>.None);

        // Assert
        result.IsOk.Should().BeTrue();
        var goal = result.ResultValue;
        goal.Name.Should().Be(name);
        goal.TargetAmount.Should().Be(target);
        goal.CurrentAmount.Should().Be(0m);
        goal.Status.IsInProgress.Should().BeTrue();
    }

    [Fact]
    public void DepositGoal_ShouldUpdateAmount_AndStatusIfNeeded()
    {
        // Arrange
        var goalResult = GoalModule.create(_userId, "Carro", 10000m, FSharpOption<DateTime>.None, FSharpOption<Guid>.None);
        var goal = goalResult.ResultValue;

        // Act - Depósito parcial
        var res1 = GoalModule.deposit(goal, 5000m); // Definindo saldo para 5000
        res1.IsOk.Should().BeTrue();
        res1.ResultValue.CurrentAmount.Should().Be(5000m);
        res1.ResultValue.Status.IsInProgress.Should().BeTrue();

        // Act - Atingindo a meta
        var res2 = GoalModule.deposit(res1.ResultValue, 10000m);
        res2.IsOk.Should().BeTrue();
        res2.ResultValue.CurrentAmount.Should().Be(10000m);
        res2.ResultValue.Status.IsAchieved.Should().BeTrue();
    }
}
