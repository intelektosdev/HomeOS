using Microsoft.AspNetCore.Mvc;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Repositories;
using HomeOS.Api.Contracts;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/credit-cards")]
public class CreditCardController(CreditCardRepository repository) : ControllerBase
{
    private readonly CreditCardRepository _repository = repository;

    [HttpPost]
    public IActionResult Create([FromBody] CreateCreditCardRequest request)
    {
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
        _repository.Save(card);

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
        var card = _repository.GetById(id);
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
        var cards = _repository.GetAll();
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
