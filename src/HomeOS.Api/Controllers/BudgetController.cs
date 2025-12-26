using HomeOS.Domain.GoalBudgetTypes;
using HomeOS.Infra.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FSharp.Core;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/budgets")]
public class BudgetController : ControllerBase
{
    private readonly BudgetRepository _repository;

    public BudgetController(IConfiguration config)
    {
        _repository = new BudgetRepository(config);
    }

    [HttpGet]
    public IActionResult GetAll([FromQuery] Guid userId)
    {
        var budgets = _repository.GetAllByUser(userId);
        return Ok(budgets.Select(ToResponse));
    }

    [HttpGet("status")]
    public IActionResult GetAllWithStatus([FromQuery] Guid userId, [FromQuery] int? month, [FromQuery] int? year)
    {
        var budgets = _repository.GetAllByUser(userId);

        var targetDate = DateTime.Now;
        if (month.HasValue && year.HasValue)
        {
            targetDate = new DateTime(year.Value, month.Value, 1);
        }

        var result = budgets.Select(b =>
        {
            DateTime startDate, endDate;

            if (b.Period.IsMonthly)
            {
                startDate = new DateTime(targetDate.Year, targetDate.Month, 1);
                endDate = startDate.AddMonths(1).AddDays(-1);
            }
            else if (b.Period.IsYearly)
            {
                startDate = new DateTime(targetDate.Year, 1, 1);
                endDate = new DateTime(targetDate.Year, 12, 31);
            }
            else
            {
                // Custom period handling to be implemented or simplified
                startDate = DateTime.Now.AddDays(-30);
                endDate = DateTime.Now;
            }

            var spent = _repository.GetSpentAmount(b.Id, userId, startDate, endDate);
            var pct = b.AmountLimit > 0 ? (spent / b.AmountLimit) * 100 : 0;

            // Determina status baseada no threshold
            // Se pct >= 100 -> Critical
            // Se pct >= Warning (threshold * 100) -> Warning
            // Senão -> Normal

            var thresholdPct = b.AlertThreshold * 100;
            string statusLevel = "Normal";
            if (pct >= 100) statusLevel = "Critical";
            else if (pct >= thresholdPct) statusLevel = "Warning";

            return new BudgetStatusResponse(
                ToResponse(b),
                spent,
                b.AmountLimit - spent,
                pct,
                statusLevel
            );
        });

        return Ok(result);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(Guid id, [FromQuery] Guid userId)
    {
        var budget = _repository.GetById(id, userId);
        return budget != null ? Ok(ToResponse(budget)) : NotFound();
    }

    [HttpPost]
    public IActionResult Create([FromBody] CreateBudgetRequest request)
    {
        var period = request.PeriodType.ToLower() switch
        {
            "yearly" => BudgetPeriod.Yearly,
            _ => BudgetPeriod.Monthly
        };

        var scope = request.CategoryId.HasValue
            ? BudgetScope.NewCategory(request.CategoryId.Value)
            : BudgetScope.Global;

        var result = BudgetModule.create(
            request.UserId,
            request.Name,
            request.AmountLimit,
            period,
            scope,
            request.AlertThreshold
        );

        if (result.IsOk)
        {
            var budget = result.ResultValue;
            _repository.Save(budget);
            return CreatedAtAction(nameof(GetById), new { id = budget.Id, userId = budget.UserId }, ToResponse(budget));
        }

        return BadRequest(new { error = result.ErrorValue.ToString() });
    }

    [HttpPut("{id}")]
    public IActionResult Update(Guid id, [FromBody] UpdateBudgetRequest request)
    {
        var budget = _repository.GetById(id, request.UserId);
        if (budget == null) return NotFound();

        var alertThreshold = request.AlertThreshold.HasValue
            ? FSharpOption<decimal>.Some(request.AlertThreshold.Value)
            : FSharpOption<decimal>.None;

        var result = BudgetModule.update(budget, request.Name, request.AmountLimit, alertThreshold);

        if (result.IsOk)
        {
            var updated = result.ResultValue;
            _repository.Save(updated);
            return Ok(ToResponse(updated));
        }

        return BadRequest(new { error = result.ErrorValue.ToString() });
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(Guid id, [FromQuery] Guid userId)
    {
        var budget = _repository.GetById(id, userId);
        if (budget == null) return NotFound();

        _repository.Delete(id, userId);
        return NoContent();
    }

    private BudgetResponse ToResponse(Budget budget)
    {
        Guid? categoryId = null;
        if (budget.Scope.IsCategory)
        {
            categoryId = ((BudgetScope.Category)budget.Scope).categoryId;
        }

        return new BudgetResponse(
            budget.Id,
            budget.UserId,
            budget.Name,
            budget.AmountLimit,
            budget.Period.IsMonthly ? "Monthly" : "Yearly",
            categoryId,
            budget.AlertThreshold
        );
    }
}

public record BudgetResponse(
    Guid Id,
    Guid UserId,
    string Name,
    decimal AmountLimit,
    string PeriodType,
    Guid? CategoryId,
    decimal AlertThreshold
);

public record BudgetStatusResponse(
    BudgetResponse Budget,
    decimal SpentAmount,
    decimal RemainingAmount,
    decimal PercentageUsed,
    string StatusLevel // Normal, Warning, Critical
);

public record CreateBudgetRequest(
    Guid UserId,
    string Name,
    decimal AmountLimit,
    string PeriodType,
    Guid? CategoryId,
    decimal AlertThreshold = 0.8m
);

public record UpdateBudgetRequest(
    Guid UserId,
    string Name,
    decimal AmountLimit,
    decimal? AlertThreshold
);
