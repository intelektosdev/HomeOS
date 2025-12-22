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

        return CreatedAtAction(nameof(GetById), new { id = transaction.Id }, MapToResponse(transaction));
    }

    // 2. GET (Extrato): Endpoint novo
    [HttpGet]
    public IActionResult GetStatement([FromQuery] DateTime? start, [FromQuery] DateTime? end)
    {
        // Padrão: Mês atual se não passar data
        var startDate = start ?? new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
        var endDate = end ?? startDate.AddMonths(1).AddDays(-1);

        var transactions = _repository.GetStatement(startDate, endDate);

        // Map dynamic results to proper DTOs
        var response = transactions.Select(t => new
        {
            Id = (Guid)t.Id,
            Description = (string)t.Description,
            Amount = (decimal)t.Amount,
            Status = (string)t.Status,
            DueDate = (DateTime)t.DueDate,
            CategoryId = (Guid)t.CategoryId,
            AccountId = t.AccountId != null ? (Guid?)t.AccountId : null,
            CreditCardId = t.CreditCardId != null ? (Guid?)t.CreditCardId : null
        }).ToList();

        return Ok(response);
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
    // 4. PUT: Atualizar Transação
    [HttpPut("{id}")]
    public IActionResult Update(Guid id, [FromBody] UpdateTransactionRequest request)
    {
        var transaction = _repository.GetById(id);
        if (transaction == null) return NotFound();

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

        var result = TransactionModule.update(
            transaction,
            request.Description,
            request.Amount,
            request.DueDate,
            request.CategoryId,
            source
        );

        if (result.IsError)
        {
            return BadRequest(new { error = result.ErrorValue.ToString() });
        }

        var updatedTransaction = result.ResultValue;
        _repository.Save(updatedTransaction);

        return Ok(MapToResponse(updatedTransaction));
    }

    // 5. POST: Cancelar Transação
    [HttpPost("{id}/cancel")]
    public IActionResult Cancel(Guid id, [FromBody] CancelTransactionRequest request)
    {
        var transaction = _repository.GetById(id);
        if (transaction == null) return NotFound();

        var result = TransactionModule.cancel(transaction, request.Reason);

        if (result.IsError)
        {
            return BadRequest(new { error = result.ErrorValue.ToString() });
        }

        var updatedTransaction = result.ResultValue;
        _repository.Save(updatedTransaction);

        return Ok(MapToResponse(updatedTransaction));
    }

    // 6. POST: Pagar Transação
    [HttpPost("{id}/pay")]
    public IActionResult Pay(Guid id, [FromBody] PayTransactionRequest request)
    {
        var existing = _repository.GetById(id);
        if (existing == null) return NotFound();

        var paymentDate = request.PaymentDate ?? DateTime.Now;
        var result = TransactionModule.pay(existing, paymentDate);

        if (result.IsError)
        {
            return BadRequest(new { error = result.ErrorValue.ToString() });
        }

        var updatedTransaction = result.ResultValue;
        _repository.Save(updatedTransaction);

        return Ok(MapToResponse(updatedTransaction));
    }

    // 7. POST: Conciliar Transação
    [HttpPost("{id}/conciliate")]
    public IActionResult Conciliate(Guid id, [FromBody] ConciliateTransactionRequest request)
    {
        var existing = _repository.GetById(id);
        if (existing == null) return NotFound();

        var conciliatedAt = request.ConciliatedAt ?? DateTime.Now;
        var result = TransactionModule.conciliate(existing, conciliatedAt);

        if (result.IsError)
        {
            return BadRequest(new { error = result.ErrorValue.ToString() });
        }

        var updatedTransaction = result.ResultValue;
        _repository.Save(updatedTransaction);

        return Ok(MapToResponse(updatedTransaction));
    }

    private TransactionResponse MapToResponse(Transaction t)
    {
        return new TransactionResponse(
            t.Id,
            t.Description,
            t.Amount,
            t.Status.ToString(),
            t.DueDate,
            t.CategoryId,
            t.Source.IsFromAccount ? ((TransactionSource.FromAccount)t.Source).accountId : (Guid?)null,
            t.Source.IsFromCreditCard ? ((TransactionSource.FromCreditCard)t.Source).creditCardId : (Guid?)null
        );
    }
}