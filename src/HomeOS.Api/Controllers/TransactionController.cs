using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Repositories;
using HomeOS.Api.Contracts;
using System.Security.Claims;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/transactions")]
[Authorize]
public class TransactionController(TransactionRepository repository, CategoryRepository categoryRepository) : ControllerBase
{
    private readonly TransactionRepository _repository = repository;
    private readonly CategoryRepository _categoryRepository = categoryRepository;

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in token");
        }
        return userId;
    }

    // 1. POST: Create Expense (supports installments via Credit Card)
    [HttpPost]
    public IActionResult CreateExpense([FromBody] CreateTransactionRequest request)
    {
        var userId = GetCurrentUserId();

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

        var installments = request.InstallmentCount ?? 1;

        // Fetch category to determine transaction type
        var category = _categoryRepository.GetById(request.CategoryId, userId);
        if (category == null)
        {
            return BadRequest(new { error = "Category not found" });
        }

        if (installments > 1)
        {
            if (!request.CreditCardId.HasValue)
            {
                return BadRequest(new { error = "Installments are only allowed for Credit Card transactions." });
            }

            decimal totalAmount = request.Amount;
            decimal installmentValue = Math.Floor(totalAmount / installments * 100) / 100;
            decimal remainder = totalAmount - (installmentValue * installments);

            var installmentId = Guid.NewGuid();
            var createdTransactions = new List<Transaction>();

            for (int i = 0; i < installments; i++)
            {
                decimal currentAmount = installmentValue + (i == 0 ? remainder : 0);
                DateTime currentDueDate = request.DueDate.AddMonths(i);

                var result = TransactionModule.createExpense(
                    request.Description,
                    currentAmount,
                    currentDueDate,
                    request.CategoryId,
                    source
                );

                if (result.IsError) return BadRequest(new { error = result.ErrorValue.ToString() });

                var t = result.ResultValue;

                // Set correct type based on category
                if (category.Type == TransactionType.Income)
                {
                    t = new Transaction(
                        t.Id, t.Description, TransactionType.Income, t.Status,
                        t.Amount, t.DueDate, t.CreatedAt, t.CategoryId, t.Source,
                        t.BillPaymentId, t.InstallmentId, t.InstallmentNumber, t.TotalInstallments
                    );
                }

                // Add installment details
                t = TransactionModule.addInstallmentDetails(t, installmentId, i + 1, installments);

                _repository.Save(t, userId);
                createdTransactions.Add(t);
            }

            return CreatedAtAction(nameof(GetById), new { id = createdTransactions[0].Id }, MapToResponse(createdTransactions[0]));
        }
        else
        {
            var result = TransactionModule.createExpense(
                request.Description,
                request.Amount,
                request.DueDate,
                request.CategoryId,
                source
            );

            if (result.IsError) return BadRequest(new { error = result.ErrorValue.ToString() });

            var transaction = result.ResultValue;

            // Set correct type based on category
            if (category.Type == TransactionType.Income)
            {
                transaction = new Transaction(
                    transaction.Id, transaction.Description, TransactionType.Income, transaction.Status,
                    transaction.Amount, transaction.DueDate, transaction.CreatedAt, transaction.CategoryId, transaction.Source,
                    transaction.BillPaymentId, transaction.InstallmentId, transaction.InstallmentNumber, transaction.TotalInstallments
                );
            }

            _repository.Save(transaction, userId);

            return CreatedAtAction(nameof(GetById), new { id = transaction.Id }, MapToResponse(transaction));
        }
    }

    // 2. GET (Extrato)
    [HttpGet]
    public IActionResult GetStatement([FromQuery] DateTime? start, [FromQuery] DateTime? end)
    {
        var userId = GetCurrentUserId();
        var startDate = start ?? new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
        var endDate = end ?? startDate.AddMonths(1).AddDays(-1);

        var transactions = _repository.GetStatement(startDate, endDate, userId);

        var response = transactions.Select(t => new
        {
            Id = (Guid)t.Id,
            Description = (string)t.Description,
            Amount = (decimal)t.Amount,
            Status = (string)t.Status,
            DueDate = (DateTime)t.DueDate,
            CategoryId = (Guid)t.CategoryId,
            AccountId = t.AccountId != null ? (Guid?)t.AccountId : null,
            CreditCardId = t.CreditCardId != null ? (Guid?)t.CreditCardId : null,
            BillPaymentId = t.BillPaymentId != null ? (Guid?)t.BillPaymentId : null
        }).ToList();

        return Ok(response);
    }

    // 3. GET Single
    [HttpGet("{id}")]
    public IActionResult GetById(Guid id)
    {
        var userId = GetCurrentUserId();
        var transaction = _repository.GetById(id, userId);
        if (transaction == null) return NotFound();

        return Ok(MapToResponse(transaction));
    }

    // 4. PUT: Atualizar Transação
    [HttpPut("{id}")]
    public IActionResult Update(Guid id, [FromBody] UpdateTransactionRequest request)
    {
        var userId = GetCurrentUserId();
        var transaction = _repository.GetById(id, userId);
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

        if (result.IsError) return BadRequest(new { error = result.ErrorValue.ToString() });

        var updatedTransaction = result.ResultValue;
        _repository.Save(updatedTransaction, userId);

        return Ok(MapToResponse(updatedTransaction));
    }

    // 5. POST: Cancelar Transação
    [HttpPost("{id}/cancel")]
    public IActionResult Cancel(Guid id, [FromBody] CancelTransactionRequest request)
    {
        var userId = GetCurrentUserId();
        var transaction = _repository.GetById(id, userId);
        if (transaction == null) return NotFound();

        var result = TransactionModule.cancel(transaction, request.Reason);

        if (result.IsError) return BadRequest(new { error = result.ErrorValue.ToString() });

        var updatedTransaction = result.ResultValue;
        _repository.Save(updatedTransaction, userId);

        return Ok(MapToResponse(updatedTransaction));
    }

    // 6. POST: Pagar Transação
    [HttpPost("{id}/pay")]
    public IActionResult Pay(Guid id, [FromBody] PayTransactionRequest request)
    {
        var userId = GetCurrentUserId();
        var existing = _repository.GetById(id, userId);
        if (existing == null) return NotFound();

        var paymentDate = request.PaymentDate ?? DateTime.Now;
        var result = TransactionModule.pay(existing, paymentDate);

        if (result.IsError) return BadRequest(new { error = result.ErrorValue.ToString() });

        var updatedTransaction = result.ResultValue;
        _repository.Save(updatedTransaction, userId);

        return Ok(MapToResponse(updatedTransaction));
    }

    // 7. POST: Conciliar Transação
    [HttpPost("{id}/conciliate")]
    public IActionResult Conciliate(Guid id, [FromBody] ConciliateTransactionRequest request)
    {
        var userId = GetCurrentUserId();
        var existing = _repository.GetById(id, userId);
        if (existing == null) return NotFound();

        var conciliatedAt = request.ConciliatedAt ?? DateTime.Now;
        var result = TransactionModule.conciliate(existing, conciliatedAt);

        if (result.IsError) return BadRequest(new { error = result.ErrorValue.ToString() });

        var updatedTransaction = result.ResultValue;
        _repository.Save(updatedTransaction, userId);

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
            t.Source.IsFromCreditCard ? ((TransactionSource.FromCreditCard)t.Source).creditCardId : (Guid?)null,

            // Installment Mapping
            Microsoft.FSharp.Core.FSharpOption<Guid>.get_IsSome(t.InstallmentId) ? t.InstallmentId.Value : (Guid?)null,
            Microsoft.FSharp.Core.FSharpOption<int>.get_IsSome(t.InstallmentNumber) ? t.InstallmentNumber.Value : (int?)null,
            Microsoft.FSharp.Core.FSharpOption<int>.get_IsSome(t.TotalInstallments) ? t.TotalInstallments.Value : (int?)null
        );
    }
}