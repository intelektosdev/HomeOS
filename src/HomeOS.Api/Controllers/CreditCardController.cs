using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Repositories;
using HomeOS.Api.Contracts;
using System.Security.Claims;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/credit-cards")]
// [Authorize] // Disabled for local development
public class CreditCardController(
    CreditCardRepository repository,
    CreditCardPaymentRepository paymentRepository,
    TransactionRepository transactionRepository,
    CreditCardTransactionRepository ccTransactionRepository, // Injected new repo
    CategoryRepository categoryRepository,
    ILogger<CreditCardController> logger) : ControllerBase
{
    private readonly CreditCardRepository _repository = repository;
    private readonly CreditCardPaymentRepository _paymentRepository = paymentRepository;
    private readonly TransactionRepository _transactionRepository = transactionRepository;
    private readonly CreditCardTransactionRepository _ccTransactionRepository = ccTransactionRepository; // Generic field
    private readonly CategoryRepository _categoryRepository = categoryRepository;
    private readonly ILogger<CreditCardController> _logger = logger;

    // Fixed userId for local development without authentication
    private static readonly Guid FixedUserId = Guid.Parse("22f4bd46-313d-424a-83b9-0c367ad46c3b");

    private Guid GetCurrentUserId()
    {
        return FixedUserId;
    }


    [HttpPost]
    public IActionResult Create([FromBody] CreateCreditCardRequest request)
    {
        var userId = GetCurrentUserId();

        var result = CreditCardModule.create(
            request.Name,
            request.ClosingDay,
            request.DueDay,
            request.Limit
        );

        if (result.IsError)
        {
            return BadRequest(new { error = result.ErrorValue.ToString() });
        }

        var card = result.ResultValue;
        _repository.Save(card, userId);

        var response = new CreditCardResponse(
            card.Id,
            card.Name,
            card.ClosingDay,
            card.DueDay,
            card.Limit
        );

        return CreatedAtAction(nameof(GetById), new { id = card.Id }, response);
    }

    [HttpPut("{id}")]
    public IActionResult Update(Guid id, [FromBody] UpdateCreditCardRequest request)
    {
        var userId = GetCurrentUserId();
        var existingCard = _repository.GetById(id, userId);

        if (existingCard == null) return NotFound();

        var result = CreditCardModule.update(
            existingCard,
            request.Name,
            request.ClosingDay,
            request.DueDay,
            request.Limit
        );

        if (result.IsError)
        {
            return BadRequest(new { error = result.ErrorValue.ToString() });
        }

        var updatedCard = result.ResultValue;
        _repository.Save(updatedCard, userId);

        return NoContent();
    }

    [HttpGet("{id}")]
    public IActionResult GetById(Guid id)
    {
        var userId = GetCurrentUserId();
        var card = _repository.GetById(id, userId);
        if (card == null) return NotFound();

        var response = new CreditCardResponse(
            card.Id,
            card.Name,
            card.ClosingDay,
            card.DueDay,
            card.Limit
        );

        return Ok(response);
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var userId = GetCurrentUserId();
        var cards = _repository.GetAll(userId);
        var response = cards.Select(c => new CreditCardResponse(
            c.Id,
            c.Name,
            c.ClosingDay,
            c.DueDay,
            c.Limit
        ));

        return Ok(response);
    }

    /// <summary>
    /// Get card balance: limit, used, available
    /// </summary>
    /// <summary>
    /// Get card balance: limit, used, available
    /// </summary>
    [HttpGet("{id}/balance")]
    public IActionResult GetBalance(Guid id)
    {
        var userId = GetCurrentUserId();
        var card = _repository.GetById(id, userId);
        if (card == null) return NotFound();

        // Calculate Used Limit from Open Transactions
        var pendingTransactions = _ccTransactionRepository.GetOpenTransactions(id, userId);
        var usedLimit = pendingTransactions.Sum(t => t.Amount);

        var response = new CreditCardBalanceResponse(
            card.Id,
            card.Name,
            card.Limit,
            usedLimit,
            card.Limit - usedLimit,
            pendingTransactions.Count()
        );

        return Ok(response);
    }

    /// <summary>
    /// Get transactions pending for bill payment
    /// </summary>
    /// <summary>
    /// Get transactions pending for bill payment
    /// </summary>
    [HttpGet("{id}/pending-transactions")]
    public IActionResult GetPendingTransactions(Guid id)
    {
        var userId = GetCurrentUserId();
        var card = _repository.GetById(id, userId);
        if (card == null) return NotFound();

        var transactions = _ccTransactionRepository.GetOpenTransactions(id, userId);

        // Map to ensure correct casing for frontend
        var response = transactions.Select(t => new
        {
            Id = (Guid)t.Id,
            Description = (string)t.Description,
            Amount = (decimal)t.Amount,
            DueDate = (DateTime)t.TransactionDate, // Using TransactionDate as DueDate for now in display
            CategoryId = (Guid)t.CategoryId,
            Status = t.Status.IsPaid ? "Paid" : t.Status.IsInvoiced ? "Invoiced" : "Pending",
            InstallmentNumber = Microsoft.FSharp.Core.FSharpOption<int>.get_IsSome(t.InstallmentNumber) ? (int?)t.InstallmentNumber.Value : null,
            TotalInstallments = Microsoft.FSharp.Core.FSharpOption<int>.get_IsSome(t.TotalInstallments) ? (int?)t.TotalInstallments.Value : null
        });

        return Ok(response);
    }

    /// <summary>
    /// Get payment history for a credit card
    /// </summary>
    [HttpGet("{id}/payments")]
    public IActionResult GetPayments(Guid id)
    {
        var userId = GetCurrentUserId();
        var card = _repository.GetById(id, userId);
        if (card == null) return NotFound();

        var payments = _paymentRepository.GetByCardId(id, userId);
        
        // Map to response
        var response = payments.Select(p => new 
        {
             Id = p.Id,
             Amount = p.Amount,
             PaymentDate = p.PaymentDate,
             ReferenceMonth = p.ReferenceMonth
        });

        return Ok(response);
    }

    /// <summary>
    /// Pay credit card bill
    /// </summary>
    [HttpPost("{id}/pay-bill")]
    public IActionResult PayBill(Guid id, [FromBody] PayBillRequest request)
    {
        var userId = GetCurrentUserId();
        var card = _repository.GetById(id, userId);
        if (card == null) return NotFound();

        try
        {
            // 1. Handle Category Fallback
            var categoryId = request.CategoryId ?? Guid.Empty;
            if (categoryId == Guid.Empty)
            {
                var categories = _categoryRepository.GetAll(userId);
                categoryId = categories.FirstOrDefault(c => c.Type == TransactionType.Expense)?.Id ?? Guid.Empty;
                
                if (categoryId == Guid.Empty)
                {
                    return BadRequest(new { error = "Nenhuma categoria de despesa encontrada para vincular ao pagamento." });
                }
            }

            // 2. Handle PaymentDate Capping (Avoid "Future Date" errors in F# domain due to UTC/Local mismatches)
            var paymentDate = request.PaymentDate;
            if (paymentDate > DateTime.Now)
            {
                paymentDate = DateTime.Now;
            }

            // 3. Create the Payment Record (History)
            var paymentId = Guid.NewGuid();
            var payment = new CreditCardPayment(
                paymentId,
                id,
                request.AccountId,
                request.Amount,
                paymentDate,
                int.Parse(request.ReferenceMonth)
            );
            _paymentRepository.Save(payment, userId);

            // 4. Create the Bank Transaction (Money Leaving Account)
            var source = TransactionSource.NewFromAccount(request.AccountId);

            // This transaction represents the payment outflow
            var bankTransactionResult = TransactionModule.createExpense(
                $"Pagamento Fatura {card.Name}",
                request.Amount,
                paymentDate,
                categoryId,
                source
            );

            if (bankTransactionResult.IsError)
            {
                return BadRequest(new { error = $"Erro na criação da transação: {bankTransactionResult.ErrorValue}" });
            }

            var bankTransaction = bankTransactionResult.ResultValue;
            // Mark as immediately paid since it's a bill payment
            var payResult = TransactionModule.pay(bankTransaction, paymentDate);
            if (payResult.IsError)
            {
                return BadRequest(new { error = $"Erro ao processar pagamento: {payResult.ErrorValue}" });
            }
            
            bankTransaction = payResult.ResultValue;
            _transactionRepository.Save(bankTransaction, userId);

            // 5. Link Credit Card Transactions
            var txIds = request.TransactionIds?.ToList() ?? new List<Guid>();
            
            if (txIds.Any())
            {
                _ccTransactionRepository.LinkToPayment(txIds, paymentId);
            }

            return Ok(new PayBillResponse(payment.Id, request.Amount, txIds.Count));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error paying bill for card {CardId}", id);
            return StatusCode(500, new { error = "Ocorreu um erro interno ao processar o pagamento." });
        }
    }
}
