using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using HomeOS.Domain.InventoryTypes;
using HomeOS.Infra.Repositories;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/suppliers")]
[Authorize]
public class SupplierController : ControllerBase
{
    private readonly SupplierRepository _repository;

    public SupplierController(SupplierRepository repository)
    {
        _repository = repository;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var userId = GetCurrentUserId();
        var suppliers = _repository.GetAll(userId);

        var response = suppliers.Select(s => new
        {
            s.Id,
            s.Name,
            Email = Microsoft.FSharp.Core.OptionModule.IsSome(s.Email) ? s.Email.Value : null,
            Phone = Microsoft.FSharp.Core.OptionModule.IsSome(s.Phone) ? s.Phone.Value : null,
            s.CreatedAt
        });

        return Ok(response);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(Guid id)
    {
        var userId = GetCurrentUserId();
        var supplier = _repository.GetById(id, userId);

        if (supplier == null)
            return NotFound();

        return Ok(new
        {
            supplier.Id,
            supplier.Name,
            Email = Microsoft.FSharp.Core.OptionModule.IsSome(supplier.Email) ? supplier.Email.Value : null,
            Phone = Microsoft.FSharp.Core.OptionModule.IsSome(supplier.Phone) ? supplier.Phone.Value : null,
            supplier.CreatedAt
        });
    }

    [HttpPost]
    public IActionResult Create([FromBody] CreateSupplierRequest request)
    {
        var userId = GetCurrentUserId();

        var email = !string.IsNullOrEmpty(request.Email)
            ? Microsoft.FSharp.Core.FSharpOption<string>.Some(request.Email)
            : Microsoft.FSharp.Core.FSharpOption<string>.None;

        var phone = !string.IsNullOrEmpty(request.Phone)
            ? Microsoft.FSharp.Core.FSharpOption<string>.Some(request.Phone)
            : Microsoft.FSharp.Core.FSharpOption<string>.None;

        var supplier = SupplierModule.create(request.Name, email, phone);

        _repository.Save(supplier, userId);

        return CreatedAtAction(nameof(GetById), new { id = supplier.Id }, new { supplier.Id });
    }
}

public record CreateSupplierRequest(string Name, string? Email, string? Phone);
