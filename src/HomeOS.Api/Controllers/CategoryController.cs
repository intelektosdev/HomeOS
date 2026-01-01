using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Repositories;
using HomeOS.Api.Contracts;
using Microsoft.FSharp.Core;
using System.Security.Claims;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/categories")]
// [Authorize] // Disabled for local development
public class CategoryController(CategoryRepository repository) : ControllerBase
{
    private readonly CategoryRepository _repository = repository;

    // Fixed userId for local development without authentication
    private static readonly Guid FixedUserId = Guid.Parse("22f4bd46-313d-424a-83b9-0c367ad46c3b");

    private Guid GetCurrentUserId()
    {
        return FixedUserId;
    }


    [HttpPost]
    public IActionResult Create([FromBody] CreateCategoryRequest request)
    {
        var userId = GetCurrentUserId();

        var type = request.Type.ToLower() == "income" ? TransactionType.Income : TransactionType.Expense;
        var icon = string.IsNullOrWhiteSpace(request.Icon) ? FSharpOption<string>.None : FSharpOption<string>.Some(request.Icon);

        var category = CategoryModule.create(request.Name, type, icon);

        _repository.Save(category, userId);

        var response = new CategoryResponse(
            category.Id,
            category.Name,
            category.Type.ToString(),
            OptionModule.IsSome(category.Icon) ? category.Icon.Value : null
        );

        return CreatedAtAction(nameof(GetById), new { id = category.Id }, response);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(Guid id)
    {
        var userId = GetCurrentUserId();
        var category = _repository.GetById(id, userId);
        if (category == null) return NotFound();

        var response = new CategoryResponse(
            category.Id,
            category.Name,
            category.Type.ToString(),
            OptionModule.IsSome(category.Icon) ? category.Icon.Value : null
        );

        return Ok(response);
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var userId = GetCurrentUserId();
        var categories = _repository.GetAll(userId);
        var response = categories.Select(c => new CategoryResponse(
            c.Id,
            c.Name,
            c.Type.ToString(),
            OptionModule.IsSome(c.Icon) ? c.Icon.Value : null
        ));

        return Ok(response);
    }

    [HttpPut("{id}")]
    public IActionResult Update(Guid id, [FromBody] CreateCategoryRequest request)
    {
        var userId = GetCurrentUserId();
        var existing = _repository.GetById(id, userId);
        if (existing == null) return NotFound();

        var type = request.Type.ToLower() == "income" ? TransactionType.Income : TransactionType.Expense;
        var icon = string.IsNullOrWhiteSpace(request.Icon) ? FSharpOption<string>.None : FSharpOption<string>.Some(request.Icon);

        var updated = CategoryModule.update(existing, request.Name, type, icon);
        _repository.Save(updated, userId);

        var response = new CategoryResponse(
            updated.Id,
            updated.Name,
            updated.Type.ToString(),
            OptionModule.IsSome(updated.Icon) ? updated.Icon.Value : null
        );

        return Ok(response);
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(Guid id)
    {
        var userId = GetCurrentUserId();
        var existing = _repository.GetById(id, userId);
        if (existing == null) return NotFound();

        _repository.Delete(id, userId);
        return NoContent();
    }
}
