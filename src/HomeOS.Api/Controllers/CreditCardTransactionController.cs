using Microsoft.AspNetCore.Mvc;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Repositories;
using HomeOS.Infra.Mappers;
using HomeOS.Api.Contracts;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/credit-cards/transactions")]
public class CreditCardTransactionController(
    CreditCardTransactionRepository repository) : ControllerBase
{
    private readonly CreditCardTransactionRepository _repository = repository;

    // Fixed userId for local development
    private static readonly Guid FixedUserId = Guid.Parse("22f4bd46-313d-424a-83b9-0c367ad46c3b");

    [HttpPost]
    public IActionResult Create([FromBody] CreateCreditCardTransactionRequest request)
    {
        var transaction = new CreditCardTransaction(
            Guid.NewGuid(),
            request.CreditCardId,
            FixedUserId,
            request.CategoryId,
            request.Description,
            request.Amount,
            request.TransactionDate,
            DateTime.Now,
            CreditCardTransactionStatus.Open,
            // Installments
            request.Installments > 1 ? Microsoft.FSharp.Core.FSharpOption<Guid>.Some(Guid.NewGuid()) : Microsoft.FSharp.Core.FSharpOption<Guid>.None,
            request.Installments > 1 ? Microsoft.FSharp.Core.FSharpOption<int>.Some(1) : Microsoft.FSharp.Core.FSharpOption<int>.None,
            request.Installments > 1 ? Microsoft.FSharp.Core.FSharpOption<int>.Some(request.Installments.Value) : Microsoft.FSharp.Core.FSharpOption<int>.None,
            Microsoft.FSharp.Core.FSharpOption<Guid>.None, // BillPaymentId
            request.ProductId.HasValue ? Microsoft.FSharp.Core.FSharpOption<Guid>.Some(request.ProductId.Value) : Microsoft.FSharp.Core.FSharpOption<Guid>.None // ProductId
        );
        
        // If installments, we should generate multiple records. 
        // For MVP refactor, let's keep it simple: if installments > 1, loop and save.
        
        if (request.Installments > 1)
        {
             var installmentId = Guid.NewGuid();
             var count = request.Installments.Value;
             decimal totalAmount = request.Amount;
             decimal installmentValue = Math.Floor(totalAmount / count * 100) / 100;
             decimal remainder = totalAmount - (installmentValue * count);
             
             for (int i = 0; i < count; i++)
             {
                 decimal currentAmount = installmentValue + (i == 0 ? remainder : 0);
                 DateTime currentDate = request.TransactionDate.AddMonths(i);
                 
                 var t = new CreditCardTransaction(
                    Guid.NewGuid(),
                    request.CreditCardId,
                    FixedUserId,
                    request.CategoryId,
                    request.Description + $" ({i+1}/{count})",
                    currentAmount,
                    currentDate,
                    DateTime.Now,
                    CreditCardTransactionStatus.Open,
                    Microsoft.FSharp.Core.FSharpOption<Guid>.Some(installmentId),
                    Microsoft.FSharp.Core.FSharpOption<int>.Some(i+1),
                    Microsoft.FSharp.Core.FSharpOption<int>.Some(count),
                    Microsoft.FSharp.Core.FSharpOption<Guid>.None,
                     request.ProductId.HasValue ? Microsoft.FSharp.Core.FSharpOption<Guid>.Some(request.ProductId.Value) : Microsoft.FSharp.Core.FSharpOption<Guid>.None
                 );
                 
                 _repository.Save(t);
             }
             // Return success generic
             return Ok(new { message = "Installment transactions created" });
        }
        else
        {
            _repository.Save(transaction);
            return CreatedAtAction(nameof(GetById), new { id = transaction.Id }, transaction); 
        }
    }

    [HttpGet("{id}")]
    public IActionResult GetById(Guid id)
    {
        var t = _repository.GetById(id, FixedUserId);
        if (t == null) return NotFound();
        return Ok(t);
    }
    
    [HttpGet("card/{cardId}/open")]
    public IActionResult GetOpenByCard(Guid cardId)
    {
        var transactions = _repository.GetOpenTransactions(cardId, FixedUserId);
        return Ok(transactions);
    }
}

public record CreateCreditCardTransactionRequest(
    Guid CreditCardId,
    Guid CategoryId,
    string Description,
    decimal Amount,
    DateTime TransactionDate,
    int? Installments,
    Guid? ProductId
);
