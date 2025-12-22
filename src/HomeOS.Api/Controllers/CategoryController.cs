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
[Authorize]
public class CategoryController(CategoryRepository repository) : ControllerBase
{
    private readonly CategoryRepository _repository = repository;

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
}
