using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using HomeOS.Domain.InventoryTypes;
using HomeOS.Infra.Repositories;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/product-groups")]
// [Authorize] // Disabled for local development
public class ProductGroupController : ControllerBase
{
    private readonly ProductGroupRepository _repository;

    public ProductGroupController(ProductGroupRepository repository)
    {
        _repository = repository;
    }

    // Fixed userId for local development without authentication
    private static readonly Guid FixedUserId = Guid.Parse("22f4bd46-313d-424a-83b9-0c367ad46c3b");

    private Guid GetCurrentUserId()
    {
        return FixedUserId;
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
