using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using HomeOS.Domain.InventoryTypes;
using HomeOS.Infra.Repositories;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/product-groups")]
[Authorize]
public class ProductGroupController : ControllerBase
{
    private readonly ProductGroupRepository _repository;

    public ProductGroupController(ProductGroupRepository repository)
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
        var groups = _repository.GetAll(userId);

        var response = groups.Select(g => new
        {
            g.Id,
            g.Name,
            Description = Microsoft.FSharp.Core.OptionModule.IsSome(g.Description) ? g.Description.Value : null,
            g.CreatedAt
        });

        return Ok(response);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(Guid id)
    {
        var userId = GetCurrentUserId();
        var group = _repository.GetById(id, userId);

        if (group == null)
            return NotFound();

        return Ok(new
        {
            group.Id,
            group.Name,
            Description = Microsoft.FSharp.Core.OptionModule.IsSome(group.Description) ? group.Description.Value : null,
            group.CreatedAt
        });
    }

    [HttpPost]
    public IActionResult Create([FromBody] CreateProductGroupRequest request)
    {
        var userId = GetCurrentUserId();

        var description = !string.IsNullOrEmpty(request.Description)
            ? Microsoft.FSharp.Core.FSharpOption<string>.Some(request.Description)
            : Microsoft.FSharp.Core.FSharpOption<string>.None;

        var group = ProductGroupModule.create(request.Name, description);

        _repository.Save(group, userId);

        return CreatedAtAction(nameof(GetById), new { id = group.Id }, new { group.Id });
    }
    [HttpPut("{id}")]
    public IActionResult Update(Guid id, [FromBody] UpdateProductGroupRequest request)
    {
        var userId = GetCurrentUserId();
        var existing = _repository.GetById(id, userId);
        if (existing == null) return NotFound();

        var description = !string.IsNullOrEmpty(request.Description)
            ? Microsoft.FSharp.Core.FSharpOption<string>.Some(request.Description)
            : Microsoft.FSharp.Core.FSharpOption<string>.None;

        var group = ProductGroupModule.update(existing, request.Name, description);

        _repository.Save(group, userId);

        return Ok(new { group.Id });
    }
}

public record CreateProductGroupRequest(string Name, string? Description);
public record UpdateProductGroupRequest(string Name, string? Description);
