using HomeOS.Domain.InvestmentTypes;
using HomeOS.Infra.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FSharp.Core;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/investments")]
public class InvestmentController : ControllerBase
{
    private readonly InvestmentRepository _repository;

    public InvestmentController(IConfiguration config)
    {
        _repository = new InvestmentRepository(config);
    }

    [HttpGet]
    public IActionResult GetAll([FromQuery] Guid userId, [FromQuery] bool onlyActive = false)
    {
        var investments = onlyActive
            ? _repository.GetActiveInvestments(userId)
            : _repository.GetAllByUser(userId);

        return Ok(investments.Select(ToResponse));
    }

    [HttpGet("{id}")]
    public IActionResult GetById(Guid id, [FromQuery] Guid userId)
    {
        var investment = _repository.GetById(id, userId);
        return investment != null ? Ok(ToResponse(investment)) : NotFound();
    }

    [HttpPost]
    public IActionResult Create([FromBody] CreateInvestmentRequest request)
    {
        // Parse investment type
        var invType = request.Type.ToLower() switch
        {
            "stock" => InvestmentType.NewStock(request.Ticker ?? ""),
            "fixedincome" when request.FixedIncomeSubType == "CDB" =>
                InvestmentType.NewFixedIncome(FixedIncomeType.NewCDB(request.Bank ?? "")),
            "fixedincome" when request.FixedIncomeSubType == "LCI" =>
                InvestmentType.NewFixedIncome(FixedIncomeType.LCI),
            "fixedincome" when request.FixedIncomeSubType == "LCA" =>
                InvestmentType.NewFixedIncome(FixedIncomeType.LCA),
            "fixedincome" when request.FixedIncomeSubType == "TesouroDireto" =>
                InvestmentType.NewFixedIncome(FixedIncomeType.NewTesouroDireto(request.Title ?? "")),
            "realestate" => InvestmentType.NewRealEstate(request.Property ?? ""),
            "cryptocurrency" => InvestmentType.NewCryptocurrency(request.Symbol ?? ""),
            _ => InvestmentType.NewOther(request.Description ?? "")
        };

        var result = InvestmentModule.create(
            request.UserId,
            request.Name,
            invType,
            request.InitialAmount,
            request.Quantity,
            request.UnitPrice,
            request.InvestmentDate
        );

        if (result.IsOk)
        {
            var investment = result.ResultValue;

            // Atualizar campos opcionais se fornecidos
            if (request.MaturityDate.HasValue || request.AnnualYield.HasValue)
            {
                var maturityDate = request.MaturityDate.HasValue
                    ? FSharpOption<DateTime>.Some(request.MaturityDate.Value)
                    : FSharpOption<DateTime>.None;

                var annualYield = request.AnnualYield.HasValue
                    ? FSharpOption<decimal>.Some(request.AnnualYield.Value)
                    : FSharpOption<decimal>.None;

                var updatedInvestment = new Investment(
                    investment.Id, investment.UserId, investment.Name, investment.Type,
                    investment.InitialAmount, investment.CurrentQuantity, investment.AveragePrice,
                    investment.CurrentPrice, investment.InvestmentDate, maturityDate, annualYield,
                    investment.Status, investment.LinkedAccountId, investment.Notes
                );

                _repository.Save(updatedInvestment);
                return CreatedAtAction(nameof(GetById), new { id = investment.Id, userId = investment.UserId }, ToResponse(updatedInvestment));
            }
            else
            {
                _repository.Save(investment);
                return CreatedAtAction(nameof(GetById), new { id = investment.Id, userId = investment.UserId }, ToResponse(investment));
            }
        }

        return BadRequest(new { error = result.ErrorValue.ToString() });
    }

    [HttpPut("{id}")]
    public IActionResult Update(Guid id, [FromBody] UpdateInvestmentRequest request)
    {
        var investment = _repository.GetById(id, request.UserId);
        if (investment == null) return NotFound();

        var annualYield = request.AnnualYield.HasValue
            ? FSharpOption<decimal>.Some(request.AnnualYield.Value)
            : FSharpOption<decimal>.None;

        var linkedAccountId = request.LinkedAccountId.HasValue
            ? FSharpOption<Guid>.Some(request.LinkedAccountId.Value)
            : FSharpOption<Guid>.None;

        var notes = !string.IsNullOrEmpty(request.Notes)
            ? FSharpOption<string>.Some(request.Notes)
            : FSharpOption<string>.None;

        var result = InvestmentModule.update(
            investment,
            request.Name,
            request.CurrentPrice,
            annualYield,
            linkedAccountId,
            notes
        );

        if (result.IsOk)
        {
            var updatedInvestment = result.ResultValue;
            _repository.Save(updatedInvestment);
            return Ok(ToResponse(updatedInvestment));
        }

        return BadRequest(new { error = result.ErrorValue.ToString() });
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(Guid id, [FromQuery] Guid userId)
    {
        var investment = _repository.GetById(id, userId);
        if (investment == null) return NotFound();

        _repository.Delete(id, userId);
        return NoContent();
    }

    [HttpPost("{id}/buy")]
    public IActionResult Buy(Guid id, [FromBody] BuySellRequest request)
    {
        var investment = _repository.GetById(id, request.UserId);
        if (investment == null) return NotFound();

        var result = InvestmentModule.buy(investment, request.Quantity, request.UnitPrice);

        if (result.IsOk)
        {
            var updatedInvestment = result.ResultValue;
            _repository.Save(updatedInvestment);

            // Registrar transação
            var transaction = new InvestmentTransaction(
                Guid.NewGuid(),
                id,
                InvestmentTransactionType.Buy,
                request.Date,
                request.Quantity,
                request.UnitPrice,
                request.Quantity * request.UnitPrice,
                request.Fees ?? 0m,
                FSharpOption<Guid>.None
            );
            _repository.SaveTransaction(transaction);

            return Ok(ToResponse(updatedInvestment));
        }

        return BadRequest(new { error = result.ErrorValue.ToString() });
    }

    [HttpPost("{id}/sell")]
    public IActionResult Sell(Guid id, [FromBody] BuySellRequest request)
    {
        var investment = _repository.GetById(id, request.UserId);
        if (investment == null) return NotFound();

        var result = InvestmentModule.sell(investment, request.Quantity, request.UnitPrice);

        if (result.IsOk)
        {
            var updatedInvestment = result.ResultValue;
            _repository.Save(updatedInvestment);

            // Registrar transação
            var transaction = new InvestmentTransaction(
                Guid.NewGuid(),
                id,
                InvestmentTransactionType.Sell,
                request.Date,
                request.Quantity,
                request.UnitPrice,
                request.Quantity * request.UnitPrice,
                request.Fees ?? 0m,
                FSharpOption<Guid>.None
            );
            _repository.SaveTransaction(transaction);

            return Ok(ToResponse(updatedInvestment));
        }

        return BadRequest(new { error = result.ErrorValue.ToString() });
    }

    [HttpGet("{id}/transactions")]
    public IActionResult GetTransactions(Guid id, [FromQuery] Guid userId)
    {
        var investment = _repository.GetById(id, userId);
        if (investment == null) return NotFound();

        var transactions = _repository.GetTransactions(id);
        return Ok(transactions);
    }

    [HttpGet("{id}/performance")]
    public IActionResult GetPerformance(Guid id, [FromQuery] Guid userId)
    {
        var investment = _repository.GetById(id, userId);
        if (investment == null) return NotFound();

        var currentValue = InvestmentModule.calculateCurrentValue(investment);
        var returnValue = InvestmentModule.calculateReturn(investment);
        var returnPct = InvestmentModule.calculateReturnPercentage(investment);
        var annualizedReturn = InvestmentModule.calculateAnnualizedReturn(investment);
        var daysInvested = InvestmentModule.calculateDaysInvested(investment);

        return Ok(new
        {
            CurrentValue = currentValue,
            TotalReturn = returnValue,
            ReturnPercentage = returnPct,
            AnnualizedReturn = annualizedReturn,
            DaysInvested = daysInvested
        });
    }

    [HttpGet("portfolio")]
    public IActionResult GetPortfolio([FromQuery] Guid userId)
    {
        var summary = _repository.GetPortfolioSummary(userId);
        var byType = _repository.GetPortfolioByType(userId);

        return Ok(new
        {
            Summary = summary,
            ByType = byType
        });
    }



    // ... (rest of methods)

    // Mapping Helpers
    private InvestmentResponse ToResponse(global::HomeOS.Domain.InvestmentTypes.Investment investment)
    {
        return new InvestmentResponse(
            investment.Id,
            investment.UserId,
            investment.Name,
            GetInvestmentTypeString(investment.Type),
            investment.InitialAmount,
            investment.CurrentQuantity,
            investment.AveragePrice,
            investment.CurrentPrice,
            investment.InvestmentDate.ToString("yyyy-MM-dd"),
            FSharpOption<DateTime>.get_IsSome(investment.MaturityDate) ? investment.MaturityDate.Value : null,
            FSharpOption<decimal>.get_IsSome(investment.AnnualYield) ? investment.AnnualYield.Value : null,
            GetStatusString(investment.Status),
            FSharpOption<Guid>.get_IsSome(investment.LinkedAccountId) ? investment.LinkedAccountId.Value : null,
            FSharpOption<string>.get_IsSome(investment.Notes) ? investment.Notes.Value : null
        );
    }

    private string GetInvestmentTypeString(global::HomeOS.Domain.InvestmentTypes.InvestmentType type)
    {
        return type.Tag switch
        {
            0 => "Stock",
            1 => "FixedIncome",
            2 => "RealEstate",
            3 => "Cryptocurrency",
            _ => "Other"
        };
    }

    private string GetStatusString(global::HomeOS.Domain.InvestmentTypes.InvestmentStatus status)
    {
        return status.Tag switch
        {
            0 => "Active",
            1 => "Redeemed",
            2 => "Matured",
            _ => "Active"
        };
    }
}

// Response DTO
public record InvestmentResponse(
    Guid Id,
    Guid UserId,
    string Name,
    string Type,
    decimal InitialAmount,
    decimal CurrentQuantity,
    decimal AveragePrice,
    decimal CurrentPrice,
    string InvestmentDate,
    DateTime? MaturityDate,
    decimal? AnnualYield,
    string Status,
    Guid? LinkedAccountId,
    string? Notes
);

// Request DTOs
public record CreateInvestmentRequest(
    Guid UserId,
    string Name,
    string Type,
    string? Ticker,
    string? FixedIncomeSubType,
    string? Bank,
    string? Title,
    string? Property,
    string? Symbol,
    string? Description,
    decimal InitialAmount,
    decimal Quantity,
    decimal UnitPrice,
    DateTime InvestmentDate,
    DateTime? MaturityDate,
    decimal? AnnualYield
);

public record UpdateInvestmentRequest(
    Guid UserId,
    string Name,
    decimal CurrentPrice,
    decimal? AnnualYield,
    Guid? LinkedAccountId,
    string? Notes
);

public record BuySellRequest(
    Guid UserId,
    decimal Quantity,
    decimal UnitPrice,
    DateTime Date,
    decimal? Fees
);
