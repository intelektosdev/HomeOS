using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Repositories;
using HomeOS.Api.Contracts;
using System.Security.Claims;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/credit-cards")]
[Authorize]
public class CreditCardController(CreditCardRepository repository) : ControllerBase
{
    private readonly CreditCardRepository _repository = repository;

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in token");
        }
        return userId;
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
}
