using HomeOS.Domain.DebtTypes;
using HomeOS.Infra.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FSharp.Core;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/debts")]
public class DebtController : ControllerBase
{
    private readonly DebtRepository _repository;

    public DebtController(IConfiguration config)
    {
        _repository = new DebtRepository(config);
    }

    [HttpGet]
    public IActionResult GetAll([FromQuery] Guid userId, [FromQuery] bool onlyActive = false)
    {
        var debts = onlyActive
            ? _repository.GetActiveDebts(userId)
            : _repository.GetAllByUser(userId);

        return Ok(debts.Select(ToResponse));
    }

    [HttpGet("{id}")]
    public IActionResult GetById(Guid id, [FromQuery] Guid userId)
    {
        var debt = _repository.GetById(id, userId);
        return debt != null ? Ok(ToResponse(debt!)) : NotFound();
    }



    [HttpPost]
    public IActionResult Create([FromBody] CreateDebtRequest request)
    {
        // Parse category
        var category = request.Category.ToLower() switch
        {
            "mortgage" => DebtCategory.Mortgage,
            "personalloan" => DebtCategory.PersonalLoan,
            "carloan" => DebtCategory.CarLoan,
            "studentloan" => DebtCategory.StudentLoan,
            _ => DebtCategory.NewOther(request.Category)
        };

        // Parse interest type
        var interestType = request.InterestIsFixed
            ? InterestType.NewFixed(request.MonthlyRate)
            : InterestType.NewVariable(request.InterestIndexer ?? "CDI");

        // Parse amortization
        var amortizationType = request.AmortizationType.ToLower() switch
        {
            "sac" => AmortizationType.SAC,
            "bullet" => AmortizationType.Bullet,
            "custom" => AmortizationType.Custom,
            _ => AmortizationType.Price
        };

        var result = DebtModule.create(
            request.UserId,
            request.Name,
            category,
            request.Creditor,
            request.Amount,
            interestType,
            amortizationType,
            request.TotalInstallments,
            request.StartDate
        );

        if (result.IsOk)
        {
            var debt = result.ResultValue;

            // IMPORTANT: Salvar debt ANTES de installments (Foreign Key)
            _repository.Save(debt);

            // Se solicitado, gerar e salvar schedule de amortização
            if (request.GenerateSchedule)
            {
                var schedule = DebtModule.generateAmortizationSchedule(debt);
                _repository.SaveInstallments(schedule);
            }

            return CreatedAtAction(nameof(GetById), new { id = debt.Id, userId = debt.UserId }, ToResponse(debt));
        }

        return BadRequest(new { error = result.ErrorValue.ToString() });
    }

    [HttpPut("{id}")]
    public IActionResult Update(Guid id, [FromBody] UpdateDebtRequest request)
    {
        var debt = _repository.GetById(id, request.UserId);
        if (debt == null) return NotFound();

        var linkedAccountId = request.LinkedAccountId.HasValue
            ? FSharpOption<Guid>.Some(request.LinkedAccountId.Value)
            : FSharpOption<Guid>.None;

        var notes = !string.IsNullOrEmpty(request.Notes)
            ? FSharpOption<string>.Some(request.Notes)
            : FSharpOption<string>.None;

        var result = DebtModule.update(debt, request.Name, request.Creditor, linkedAccountId, notes);

        if (result.IsOk)
        {
            var updatedDebt = result.ResultValue;
            _repository.Save(updatedDebt);
            return Ok(ToResponse(updatedDebt));
        }

        return BadRequest(new { error = result.ErrorValue.ToString() });
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(Guid id, [FromQuery] Guid userId)
    {
        var debt = _repository.GetById(id, userId);
        if (debt == null) return NotFound();

        _repository.Delete(id, userId);
        return NoContent();
    }

    [HttpGet("{id}/amortization-schedule")]
    public IActionResult GetAmortizationSchedule(Guid id, [FromQuery] Guid userId)
    {
        var debt = _repository.GetById(id, userId);
        if (debt == null) return NotFound();

        // Primeiro tenta pegar do banco
        var savedSchedule = _repository.GetInstallments(id);

        if (savedSchedule.Any())
        {
            return Ok(savedSchedule);
        }

        // Se não tem, gera dinamicamente
        var schedule = DebtModule.generateAmortizationSchedule(debt);
        return Ok(schedule);
    }

    [HttpPost("{id}/pay-installment")]
    public IActionResult PayInstallment(Guid id, [FromBody] PayInstallmentRequest request)
    {
        var debt = _repository.GetById(id, request.UserId);
        if (debt == null) return NotFound();

        var result = DebtModule.payInstallment(
            debt,
            request.InstallmentNumber,
            request.PaymentDate,
            request.AmountPaid
        );

        if (result.IsOk)
        {
            var updatedDebt = result.ResultValue;
            _repository.Save(updatedDebt);

            // Atualizar installment no banco
            var installment = _repository.GetInstallmentByNumber(id, request.InstallmentNumber);
            if (installment != null)
            {
                var updatedInstallment = new DebtInstallment(
                    installment.Id,
                    installment.DebtId,
                    installment.InstallmentNumber,
                    installment.DueDate,
                    FSharpOption<DateTime>.Some(request.PaymentDate),
                    installment.TotalAmount,
                    installment.PrincipalAmount,
                    installment.InterestAmount,
                    installment.RemainingBalance,
                    request.TransactionId.HasValue
                        ? FSharpOption<Guid>.Some(request.TransactionId.Value)
                        : FSharpOption<Guid>.None
                );
                _repository.SaveInstallment(updatedInstallment);
            }

            return Ok(ToResponse(updatedDebt));
        }

        return BadRequest(new { error = result.ErrorValue.ToString() });
    }

    [HttpGet("statistics")]
    public IActionResult GetStatistics([FromQuery] Guid userId)
    {
        var totalDebt = _repository.GetTotalDebt(userId);
        var activeCount = _repository.GetActiveDebtCount(userId);

        return Ok(new
        {
            TotalDebt = totalDebt,
            ActiveDebtCount = activeCount
        });
    }

    // Mapping Helpers
    private DebtResponse ToResponse(global::HomeOS.Domain.DebtTypes.Debt debt)
    {
        return new DebtResponse(
            debt.Id,
            debt.UserId,
            debt.Name,
            GetCategoryString(debt.Category),
            debt.Creditor,
            debt.OriginalAmount,
            debt.CurrentBalance,
            GetInterestTypeString(debt.InterestType),
            debt.AmortizationType.ToString(),
            debt.StartDate.ToString("yyyy-MM-dd"),
            debt.TotalInstallments,
            debt.InstallmentsPaid,
            GetStatusString(debt.Status),
            FSharpOption<Guid>.get_IsSome(debt.LinkedAccountId) ? debt.LinkedAccountId.Value : null,
            FSharpOption<string>.get_IsSome(debt.Notes) ? debt.Notes.Value : null
        );
    }

    private string GetCategoryString(global::HomeOS.Domain.DebtTypes.DebtCategory category)
    {
        return category.Tag switch
        {
            0 => "Mortgage",
            1 => "PersonalLoan",
            2 => "CarLoan",
            3 => "StudentLoan",
            _ => "Other"
        };
    }

    private string GetInterestTypeString(global::HomeOS.Domain.DebtTypes.InterestType interestType)
    {
        // Tag 0 = Fixed, Tag 1 = Variable
        return interestType.Tag == 0 ? "Fixed" : "Variable";
    }

    private string GetStatusString(global::HomeOS.Domain.DebtTypes.DebtStatus status)
    {
        return status.Tag switch
        {
            0 => "Active",
            1 => "PaidOff",
            2 => "Refinanced",
            3 => "Defaulted",
            _ => "Active"
        };
    }
}

// Response DTO
public record DebtResponse(
    Guid Id,
    Guid UserId,
    string Name,
    string Category,
    string Creditor,
    decimal OriginalAmount,
    decimal CurrentBalance,
    string InterestType,
    string AmortizationType,
    string StartDate,
    int TotalInstallments,
    int InstallmentsPaid,
    string Status,
    Guid? LinkedAccountId,
    string? Notes
);

// Request DTOs
public record CreateDebtRequest(
    Guid UserId,
    string Name,
    string Category,
    string Creditor,
    decimal Amount,
    bool InterestIsFixed,
    decimal MonthlyRate,
    string? InterestIndexer,
    string AmortizationType,
    int TotalInstallments,
    DateTime StartDate,
    bool GenerateSchedule = true
);

public record UpdateDebtRequest(
    Guid UserId,
    string Name,
    string Creditor,
    Guid? LinkedAccountId,
    string? Notes
);

public record PayInstallmentRequest(
    Guid UserId,
    int InstallmentNumber,
    DateTime PaymentDate,
    decimal AmountPaid,
    Guid? TransactionId
);
