using Microsoft.AspNetCore.Mvc;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Repositories;
using HomeOS.Api.Contracts; // Importando os DTOs

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/transactions")]
public class TransactionController(TransactionRepository repository) : ControllerBase
{
    private readonly TransactionRepository _repository = repository;

    // 1. POST: Agora recebe um JSON no Body ([FromBody])
    [HttpPost]
    public IActionResult CreateExpense([FromBody] CreateTransactionRequest request)
    {
        // Validação: Ou AccountId ou CreditCardId, nunca ambos ou nenhum
        if ((request.AccountId.HasValue && request.CreditCardId.HasValue) ||
            (!request.AccountId.HasValue && !request.CreditCardId.HasValue))
        {
            return BadRequest(new { error = "You must provide either AccountId OR CreditCardId, but not both." });
        }

        TransactionSource source;
        if (request.AccountId.HasValue)
        {
            source = TransactionSource.NewFromAccount(request.AccountId.Value);
        }
        else
        {
            source = TransactionSource.NewFromCreditCard(request.CreditCardId!.Value);
        }

        // Chama o F# usando os dados do DTO
        var result = TransactionModule.createExpense(
            request.Description,
            request.Amount,
            request.DueDate,
            request.CategoryId,
            source
        );

        if (result.IsError)
        {
            // Tratamento de erro elegante
            return BadRequest(new { error = result.ErrorValue.ToString() });
        }

        var transaction = result.ResultValue;

        _repository.Save(transaction);

        // Mapeia de volta para o Response DTO
        var response = new TransactionResponse(
            transaction.Id,
            transaction.Description,
            transaction.Amount,
            transaction.Status.ToString(), // O ToString do F# Union é útil aqui
            transaction.DueDate
        );

        return CreatedAtAction(nameof(GetById), new { id = transaction.Id }, response);
    }

    // 2. GET (Extrato): Endpoint novo
    [HttpGet]
    public IActionResult GetStatement([FromQuery] DateTime? start, [FromQuery] DateTime? end)
    {
        // Padrão: Mês atual se não passar data
        var startDate = start ?? new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
        var endDate = end ?? startDate.AddMonths(1).AddDays(-1);

        var transactions = _repository.GetStatement(startDate, endDate);

        return Ok(transactions);
    }

    // 3. GET Single: Útil para o CreatedAtAction
    [HttpGet("{id}")]
    public IActionResult GetById(Guid id)
    {
        var transaction = _repository.GetById(id);
        if (transaction == null) return NotFound();

        // Mapeamento simples para retorno
        return Ok(new
        {
            transaction.Id,
            transaction.Description,
            transaction.Amount,
            transaction.CategoryId,
            // Source simplificado para response
            AccountId = transaction.Source.IsFromAccount ? ((TransactionSource.FromAccount)transaction.Source).accountId : (Guid?)null,
            CreditCardId = transaction.Source.IsFromCreditCard ? ((TransactionSource.FromCreditCard)transaction.Source).creditCardId : (Guid?)null
        });
    }
}