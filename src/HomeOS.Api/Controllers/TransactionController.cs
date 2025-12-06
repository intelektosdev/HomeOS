using Microsoft.AspNetCore.Mvc;
using HomeOS.Domain.FinancialTypes;
using Microsoft.FSharp.Core;
using HomeOS.Infra.Repositories;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/transactions")]
public class TransactionController : ControllerBase
{
    private readonly TransactionRepository _repository;

    public TransactionController(TransactionRepository repository)
    {
        _repository = repository;
    }
    
    [HttpPost]
    public IActionResult CreateExpense(string description, decimal amount, DateTime dueDate)
    {
        // chamando a função do modulo F#
        var result = TransactionModule.createExpense(description, amount, dueDate);

        // Verificando o resultado (Result Pattern do F# traduzido para C#)
        if (result.IsError)
        {
            // O erro é uma Tag (Enum poderoso).Podemos converter para string
            return BadRequest(result.ErrorValue.ToString());
        }

        var transaction = result.ResultValue;

        // Persistência (C# + Dapper)
        try
        {
            _repository.Save(transaction);
        }
        catch (Exception ex)
        {
            return StatusCode(500, "Erro ao salvar transação" + ex.Message);
        }

        //
        // retornando o objeto criado
        return CreatedAtAction(nameof(CreateExpense), new { id = transaction.Id }, new 
        { 
            transaction.Id, 
            transaction.Description, 
            Status = transaction.Status.ToString() 
        });
    }
}