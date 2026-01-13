using Microsoft.AspNetCore.Mvc;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Repositories;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/transfers")]
public class TransferController : ControllerBase
{
    private readonly TransferRepository _repository;
    private static readonly Guid FixedUserId = Guid.Parse("22f4bd46-313d-424a-83b9-0c367ad46c3b");

    public TransferController(TransferRepository repository)
    {
        _repository = repository;
    }

    [HttpPost]
    public IActionResult Create([FromBody] CreateTransferRequest request)
    {
        var result = TransferModule.create(
            request.FromAccountId,
            request.ToAccountId,
            request.Amount,
            request.Description,
            request.TransferDate,
            FixedUserId
        );

        if (result.IsError)
        {
            return BadRequest(new { error = result.ErrorValue.ToString() });
        }

        var transfer = result.ResultValue;
        _repository.Save(transfer);

        return CreatedAtAction(nameof(GetById), new { id = transfer.Id }, transfer);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(Guid id)
    {
        var transfer = _repository.GetById(id, FixedUserId);
        if (transfer == null) return NotFound();

        return Ok(transfer);
    }

    [HttpGet]
    public IActionResult GetAll([FromQuery] int? year, [FromQuery] int? month)
    {
        var transfers = _repository.GetByUser(FixedUserId, year, month);
        return Ok(transfers);
    }

    [HttpPatch("{id}/complete")]
    public IActionResult Complete(Guid id)
    {
        var transfer = _repository.GetById(id, FixedUserId);
        if (transfer == null) return NotFound();

        var result = TransferModule.complete(transfer, DateTime.Now);
        if (result.IsError)
        {
            return BadRequest(new { error = result.ErrorValue.ToString() });
        }

        _repository.Save(result.ResultValue);
        return NoContent();
    }

    [HttpPatch("{id}/cancel")]
    public IActionResult Cancel(Guid id, [FromBody] CancelTransferRequest request)
    {
        var transfer = _repository.GetById(id, FixedUserId);
        if (transfer == null) return NotFound();

        var result = TransferModule.cancel(transfer, request.Reason);
        if (result.IsError)
        {
            return BadRequest(new { error = result.ErrorValue.ToString() });
        }

        _repository.Save(result.ResultValue);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(Guid id)
    {
        _repository.Delete(id, FixedUserId);
        return NoContent();
    }
}

public record CreateTransferRequest(
    Guid FromAccountId,
    Guid ToAccountId,
    decimal Amount,
    string Description,
    DateTime TransferDate
);

public record CancelTransferRequest(string Reason);
