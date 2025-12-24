using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Repositories;
using HomeOS.Infra.Services;
using HomeOS.Api.Contracts;
using System.Security.Claims;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/recurring-transactions")]
[Authorize]
public class RecurringTransactionController(
    RecurringTransactionRepository repository,
    RecurringTransactionService service) : ControllerBase
{
    private readonly RecurringTransactionRepository _repository = repository;
    private readonly RecurringTransactionService _service = service;

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in token");
        }
        return userId;
    }

    /// <summary>
    /// Get all recurring transactions
    /// </summary>
    [HttpGet]
    public IActionResult GetAll([FromQuery] bool includeInactive = false)
    {
        var userId = GetCurrentUserId();
        var recurring = _repository.GetAll(userId, includeInactive);

        return Ok(recurring.Select(MapToResponse));
    }

    /// <summary>
    /// Get a single recurring transaction
    /// </summary>
    [HttpGet("{id}")]
    public IActionResult GetById(Guid id)
    {
        var userId = GetCurrentUserId();
        var recurring = _repository.GetById(id, userId);

        if (recurring == null)
            return NotFound();

        return Ok(MapToResponse(recurring));
    }

    /// <summary>
    /// Create a new recurring transaction
    /// </summary>
    [HttpPost]
    public IActionResult Create([FromBody] CreateRecurringTransactionRequest request)
    {
        var userId = GetCurrentUserId();

        // Validate source
        if ((request.AccountId.HasValue && request.CreditCardId.HasValue) ||
            (!request.AccountId.HasValue && !request.CreditCardId.HasValue))
        {
            return BadRequest(new { error = "You must provide either AccountId OR CreditCardId, but not both." });
        }

        // Parse and validate
        if (!TryParseType(request.Type, out var type))
            return BadRequest(new { error = "Invalid Type. Must be 'Income' or 'Expense'." });

        if (!TryParseFrequency(request.Frequency, out var frequency))
            return BadRequest(new { error = "Invalid Frequency." });

        if (!TryParseAmountType(request.AmountType, request.Amount, out var amountType))
            return BadRequest(new { error = "Invalid AmountType or Amount." });

        var source = request.AccountId.HasValue
            ? TransactionSource.NewFromAccount(request.AccountId.Value)
            : TransactionSource.NewFromCreditCard(request.CreditCardId!.Value);

        var dayOfMonth = request.DayOfMonth.HasValue
            ? Microsoft.FSharp.Core.FSharpOption<int>.Some(request.DayOfMonth.Value)
            : Microsoft.FSharp.Core.FSharpOption<int>.None;

        var endDate = request.EndDate.HasValue
            ? Microsoft.FSharp.Core.FSharpOption<DateTime>.Some(request.EndDate.Value)
            : Microsoft.FSharp.Core.FSharpOption<DateTime>.None;

        // Create using domain module
        var result = RecurringTransactionModule.create(
            request.Description,
            type,
            request.CategoryId,
            source,
            amountType,
            frequency,
            dayOfMonth,
            request.StartDate,
            endDate
        );

        if (result.IsError)
            return BadRequest(new { error = result.ErrorValue.ToString() });

        var recurring = result.ResultValue;
        _repository.Save(recurring, userId);

        return CreatedAtAction(nameof(GetById), new { id = recurring.Id }, MapToResponse(recurring));
    }

    /// <summary>
    /// Update an existing recurring transaction
    /// </summary>
    [HttpPut("{id}")]
    public IActionResult Update(Guid id, [FromBody] UpdateRecurringTransactionRequest request)
    {
        var userId = GetCurrentUserId();
        var existing = _repository.GetById(id, userId);

        if (existing == null)
            return NotFound();

        // Validate source
        if ((request.AccountId.HasValue && request.CreditCardId.HasValue) ||
            (!request.AccountId.HasValue && !request.CreditCardId.HasValue))
        {
            return BadRequest(new { error = "You must provide either AccountId OR CreditCardId, but not both." });
        }

        if (!TryParseFrequency(request.Frequency, out var frequency))
            return BadRequest(new { error = "Invalid Frequency." });

        if (!TryParseAmountType(request.AmountType, request.Amount, out var amountType))
            return BadRequest(new { error = "Invalid AmountType or Amount." });

        var source = request.AccountId.HasValue
            ? TransactionSource.NewFromAccount(request.AccountId.Value)
            : TransactionSource.NewFromCreditCard(request.CreditCardId!.Value);

        var dayOfMonth = request.DayOfMonth.HasValue
            ? Microsoft.FSharp.Core.FSharpOption<int>.Some(request.DayOfMonth.Value)
            : Microsoft.FSharp.Core.FSharpOption<int>.None;

        var endDate = request.EndDate.HasValue
            ? Microsoft.FSharp.Core.FSharpOption<DateTime>.Some(request.EndDate.Value)
            : Microsoft.FSharp.Core.FSharpOption<DateTime>.None;

        var result = RecurringTransactionModule.update(
            existing,
            request.Description,
            request.CategoryId,
            source,
            amountType,
            frequency,
            dayOfMonth,
            endDate
        );

        if (result.IsError)
            return BadRequest(new { error = result.ErrorValue.ToString() });

        var updated = result.ResultValue;
        _repository.Save(updated, userId);

        return Ok(MapToResponse(updated));
    }

    /// <summary>
    /// Toggle active status
    /// </summary>
    [HttpPatch("{id}/toggle")]
    public IActionResult ToggleActive(Guid id)
    {
        var userId = GetCurrentUserId();
        var recurring = _repository.GetById(id, userId);

        if (recurring == null)
            return NotFound();

        var toggled = RecurringTransactionModule.toggleActive(recurring);
        _repository.Save(toggled, userId);

        return Ok(MapToResponse(toggled));
    }

    /// <summary>
    /// Delete a recurring transaction
    /// </summary>
    [HttpDelete("{id}")]
    public IActionResult Delete(Guid id)
    {
        var userId = GetCurrentUserId();
        var recurring = _repository.GetById(id, userId);

        if (recurring == null)
            return NotFound();

        _repository.Delete(id, userId);
        return NoContent();
    }

    /// <summary>
    /// Preview next N occurrences
    /// </summary>
    [HttpPost("{id}/preview")]
    public IActionResult PreviewOccurrences(Guid id, [FromBody] GeneratePreviewRequest request)
    {
        var userId = GetCurrentUserId();
        var recurring = _repository.GetById(id, userId);

        if (recurring == null)
            return NotFound();

        var occurrences = _service.PreviewOccurrences(recurring, request.Count);

        return Ok(new PreviewOccurrenceResponse(occurrences));
    }

    /// <summary>
    /// Manual generation trigger (force generate all pending)
    /// </summary>
    [HttpPost("generate")]
    public IActionResult GenerateAll([FromQuery] int daysAhead = 30)
    {
        var userId = GetCurrentUserId();
        var targetDate = DateTime.Today.AddDays(daysAhead);
        var count = _service.GenerateTransactions(userId, targetDate);

        return Ok(new { generatedCount = count, targetDate });
    }

    private RecurringTransactionResponse MapToResponse(RecurringTransaction r)
    {
        var amount = r.AmountType.IsFixed
            ? ((AmountType.Fixed)r.AmountType).amount
            : ((AmountType.Variable)r.AmountType).averageAmount;

        return new RecurringTransactionResponse(
            r.Id,
            r.Description,
            r.Type.IsIncome ? "Income" : "Expense",
            r.CategoryId,
            r.Source.IsFromAccount ? ((TransactionSource.FromAccount)r.Source).accountId : null,
            r.Source.IsFromCreditCard ? ((TransactionSource.FromCreditCard)r.Source).creditCardId : null,
            r.AmountType.IsFixed ? "Fixed" : "Variable",
            amount,
            FrequencyToString(r.Frequency),
            Microsoft.FSharp.Core.FSharpOption<int>.get_IsSome(r.DayOfMonth) ? r.DayOfMonth.Value : null,
            r.StartDate,
            Microsoft.FSharp.Core.FSharpOption<DateTime>.get_IsSome(r.EndDate) ? r.EndDate.Value : null,
            r.NextOccurrence,
            r.IsActive,
            r.CreatedAt,
            Microsoft.FSharp.Core.FSharpOption<DateTime>.get_IsSome(r.LastGeneratedAt) ? r.LastGeneratedAt.Value : null
        );
    }

    private bool TryParseType(string type, out TransactionType result)
    {
        result = type.ToLower() switch
        {
            "income" => TransactionType.Income,
            "expense" => TransactionType.Expense,
            _ => TransactionType.Expense
        };
        return type.ToLower() is "income" or "expense";
    }

    private bool TryParseFrequency(string frequency, out RecurrenceFrequency result)
    {
        result = frequency.ToLower() switch
        {
            "daily" => RecurrenceFrequency.Daily,
            "weekly" => RecurrenceFrequency.Weekly,
            "biweekly" => RecurrenceFrequency.Biweekly,
            "monthly" => RecurrenceFrequency.Monthly,
            "bimonthly" => RecurrenceFrequency.Bimonthly,
            "quarterly" => RecurrenceFrequency.Quarterly,
            "semiannual" => RecurrenceFrequency.Semiannual,
            "annual" => RecurrenceFrequency.Annual,
            _ => RecurrenceFrequency.Monthly
        };
        return frequency.ToLower() is "daily" or "weekly" or "biweekly" or "monthly"
            or "bimonthly" or "quarterly" or "semiannual" or "annual";
    }

    private bool TryParseAmountType(string amountType, decimal amount, out AmountType result)
    {
        if (amount <= 0)
        {
            result = AmountType.NewFixed(0);
            return false;
        }

        result = amountType.ToLower() switch
        {
            "fixed" => AmountType.NewFixed(amount),
            "variable" => AmountType.NewVariable(amount),
            _ => AmountType.NewFixed(amount)
        };
        return amountType.ToLower() is "fixed" or "variable";
    }

    private string FrequencyToString(RecurrenceFrequency frequency)
    {
        return frequency.Tag switch
        {
            0 => "Daily",
            1 => "Weekly",
            2 => "Biweekly",
            3 => "Monthly",
            4 => "Bimonthly",
            5 => "Quarterly",
            6 => "Semiannual",
            7 => "Annual",
            _ => "Monthly"
        };
    }
}
