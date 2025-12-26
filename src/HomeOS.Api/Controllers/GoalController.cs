using HomeOS.Domain.GoalBudgetTypes;
using HomeOS.Infra.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FSharp.Core;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/goals")]
public class GoalController : ControllerBase
{
    private readonly GoalRepository _repository;

    public GoalController(IConfiguration config)
    {
        _repository = new GoalRepository(config);
    }

    [HttpGet]
    public IActionResult GetAll([FromQuery] Guid userId)
    {
        var goals = _repository.GetAllByUser(userId);
        return Ok(goals.Select(ToResponse));
    }

    [HttpGet("{id}")]
    public IActionResult GetById(Guid id, [FromQuery] Guid userId)
    {
        var goal = _repository.GetById(id, userId);
        return goal != null ? Ok(ToResponse(goal)) : NotFound();
    }

    [HttpPost]
    public IActionResult Create([FromBody] CreateGoalRequest request)
    {
        var deadline = request.Deadline.HasValue
            ? FSharpOption<DateTime>.Some(request.Deadline.Value)
            : FSharpOption<DateTime>.None;

        var linkedInvestment = request.LinkedInvestmentId.HasValue
            ? FSharpOption<Guid>.Some(request.LinkedInvestmentId.Value)
            : FSharpOption<Guid>.None;

        var result = GoalModule.create(
            request.UserId,
            request.Name,
            request.TargetAmount,
            deadline,
            linkedInvestment
        );

        if (result.IsOk)
        {
            var goal = result.ResultValue;
            _repository.Save(goal);
            return CreatedAtAction(nameof(GetById), new { id = goal.Id, userId = goal.UserId }, ToResponse(goal));
        }

        return BadRequest(new { error = result.ErrorValue.ToString() });
    }

    [HttpPost("{id}/deposit")]
    public IActionResult Deposit(Guid id, [FromBody] DepositGoalRequest request)
    {
        var goal = _repository.GetById(id, request.UserId);
        if (goal == null) return NotFound();

        // Para simplificar, o request envia o novo montante total, ou o valor a adicionar?
        // O domínio tem `deposit` que recebe `fullAmount`. 
        // Vamos assumir que a API recebe o valor a adicionar e soma, ou recebe o total.
        // O método F# `deposit` recebe `fullAmount` (novo saldo total).
        // Se quisermos "adicionar", precisamos somar.

        decimal newAmount = request.IsIncremental
            ? goal.CurrentAmount + request.Amount
            : request.Amount;

        var result = GoalModule.deposit(goal, newAmount);

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
        var goal = _repository.GetById(id, userId);
        if (goal == null) return NotFound();

        _repository.Delete(id, userId);
        return NoContent();
    }

    private GoalResponse ToResponse(Goal goal)
    {
        return new GoalResponse(
            goal.Id,
            goal.UserId,
            goal.Name,
            goal.TargetAmount,
            goal.CurrentAmount,
            FSharpOption<DateTime>.get_IsSome(goal.Deadline) ? goal.Deadline.Value : null,
            GetStatusString(goal.Status),
            FSharpOption<Guid>.get_IsSome(goal.LinkedInvestmentId) ? goal.LinkedInvestmentId.Value : null
        );
    }

    private string GetStatusString(GoalStatus status)
    {
        return status.Tag switch
        {
            0 => "InProgress",
            1 => "Achieved",
            2 => "Paused",
            3 => "Cancelled",
            _ => "InProgress"
        };
    }
}

public record GoalResponse(
    Guid Id,
    Guid UserId,
    string Name,
    decimal TargetAmount,
    decimal CurrentAmount,
    DateTime? Deadline,
    string Status,
    Guid? LinkedInvestmentId
);

public record CreateGoalRequest(
    Guid UserId,
    string Name,
    decimal TargetAmount,
    DateTime? Deadline,
    Guid? LinkedInvestmentId
);

public record DepositGoalRequest(
    Guid UserId,
    decimal Amount,
    bool IsIncremental = true // Se true, soma ao atual. Se false, define o novo valor absoluto.
);
