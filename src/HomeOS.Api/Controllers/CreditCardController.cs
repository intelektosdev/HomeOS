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
    TransactionRepository transactionRepository,
    CreditCardPaymentRepository paymentRepository) : ControllerBase
{
    private readonly CreditCardRepository _repository = repository;
    private readonly TransactionRepository _transactionRepository = transactionRepository;
    private readonly CreditCardPaymentRepository _paymentRepository = paymentRepository;

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
    [HttpGet("{id}/balance")]
    public IActionResult GetBalance(Guid id)
    {
        var userId = GetCurrentUserId();
        var card = _repository.GetById(id, userId);
        if (card == null) return NotFound();

        var usedLimit = _transactionRepository.GetUsedLimitByCard(id, userId);
        var pendingTransactions = _transactionRepository.GetPendingByCard(id, userId);

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
    [HttpGet("{id}/pending-transactions")]
    public IActionResult GetPendingTransactions(Guid id)
    {
        var userId = GetCurrentUserId();
        var card = _repository.GetById(id, userId);
        if (card == null) return NotFound();

        var transactions = _transactionRepository.GetPendingByCard(id, userId);

        // Map to ensure correct casing for frontend
        var response = transactions.Select(t => new
        {
            Id = (Guid)t.Id,
            Description = (string)t.Description,
            Amount = (decimal)t.Amount,
            DueDate = (DateTime)t.DueDate,
            CategoryId = (Guid)t.CategoryId,
            Status = (string)t.Status,
            InstallmentNumber = t.InstallmentNumber != null ? (int?)t.InstallmentNumber : null,
            TotalInstallments = t.TotalInstallments != null ? (int?)t.TotalInstallments : null
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

        if (request.TransactionIds == null || request.TransactionIds.Length == 0)
        {
            return BadRequest(new { error = "At least one transaction must be selected" });
        }

        // Calculate total amount from selected transactions
        var pendingTransactions = _transactionRepository.GetPendingByCard(id, userId).ToList();
        var selectedIds = request.TransactionIds.ToHashSet();
        var totalAmount = pendingTransactions
            .Where(t => selectedIds.Contains((Guid)t.Id))
            .Sum(t => (decimal)t.Amount);

        // Create payment record
        var payment = new CreditCardPayment(
            Guid.NewGuid(),
            id,
            request.AccountId,
            totalAmount,
            DateTime.Now,
            request.ReferenceMonth
        );

        _paymentRepository.Save(payment, userId);

        // Link transactions to payment and mark as Conciliated
        _transactionRepository.LinkToBillPayment(request.TransactionIds, payment.Id, userId);

        return Ok(new PayBillResponse(payment.Id, totalAmount, request.TransactionIds.Length));
    }
}

