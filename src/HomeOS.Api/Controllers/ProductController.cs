using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using HomeOS.Domain.InventoryTypes;
using HomeOS.Infra.Repositories;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductController : ControllerBase
{
    private readonly ProductRepository _repository;

    public ProductController(ProductRepository repository)
    {
        _repository = repository;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

    // GET: api/product
    [HttpGet]
    public IActionResult GetAll([FromQuery] bool includeInactive = false)
    {
        var userId = GetCurrentUserId();
        var products = _repository.GetAll(userId, includeInactive);

        var response = products.Select(p => new
        {
            p.Id,
            p.Name,
            Unit = UnitOfMeasureModule.toString(p.Unit),
            CategoryId = Microsoft.FSharp.Core.OptionModule.IsSome(p.CategoryId) ? p.CategoryId.Value : (Guid?)null,
            LastPrice = Microsoft.FSharp.Core.OptionModule.IsSome(p.LastPrice) ? p.LastPrice.Value : (decimal?)null,
            p.StockQuantity,
            MinStockAlert = Microsoft.FSharp.Core.OptionModule.IsSome(p.MinStockAlert) ? p.MinStockAlert.Value : (decimal?)null,
            p.IsActive,
            p.CreatedAt
        });

        return Ok(response);
    }

    // GET: api/product/{id}
    [HttpGet("{id}")]
    public IActionResult GetById(Guid id)
    {
        var userId = GetCurrentUserId();
        var product = _repository.GetById(id, userId);

        if (product == null)
            return NotFound();

        return Ok(new
        {
            product.Id,
            product.Name,
            Unit = UnitOfMeasureModule.toString(product.Unit),
            CategoryId = Microsoft.FSharp.Core.OptionModule.IsSome(product.CategoryId) ? product.CategoryId.Value : (Guid?)null,
            LastPrice = Microsoft.FSharp.Core.OptionModule.IsSome(product.LastPrice) ? product.LastPrice.Value : (decimal?)null,
            product.StockQuantity,
            MinStockAlert = Microsoft.FSharp.Core.OptionModule.IsSome(product.MinStockAlert) ? product.MinStockAlert.Value : (decimal?)null,
            product.IsActive,
            product.CreatedAt
        });
    }

    // GET: api/product/low-stock
    [HttpGet("low-stock")]
    public IActionResult GetLowStock()
    {
        var userId = GetCurrentUserId();
        var products = _repository.GetLowStock(userId);

        var response = products.Select(p => new
        {
            p.Id,
            p.Name,
            Unit = UnitOfMeasureModule.toString(p.Unit),
            p.StockQuantity,
            MinStockAlert = Microsoft.FSharp.Core.OptionModule.IsSome(p.MinStockAlert) ? p.MinStockAlert.Value : (decimal?)null
        });

        return Ok(response);
    }

    // POST: api/product
    [HttpPost]
    public IActionResult Create([FromBody] CreateProductRequest request)
    {
        var userId = GetCurrentUserId();

        var unitOption = UnitOfMeasureModule.fromString(request.Unit);
        var unit = Microsoft.FSharp.Core.OptionModule.IsSome(unitOption)
            ? unitOption.Value
            : UnitOfMeasure.Unit;

        var categoryId = request.CategoryId.HasValue
            ? Microsoft.FSharp.Core.FSharpOption<Guid>.Some(request.CategoryId.Value)
            : Microsoft.FSharp.Core.FSharpOption<Guid>.None;

        var productGroupId = request.ProductGroupId.HasValue
            ? Microsoft.FSharp.Core.FSharpOption<Guid>.Some(request.ProductGroupId.Value)
            : Microsoft.FSharp.Core.FSharpOption<Guid>.None;

        var barcode = !string.IsNullOrEmpty(request.Barcode)
            ? Microsoft.FSharp.Core.FSharpOption<string>.Some(request.Barcode)
            : Microsoft.FSharp.Core.FSharpOption<string>.None;

        var result = ProductModule.create(request.Name, unit, categoryId, productGroupId, barcode);

        if (result.IsError)
            return BadRequest(result.ErrorValue.ToString());

        var product = result.ResultValue;

        // Set optional MinStockAlert using the F# module function
        if (request.MinStockAlert.HasValue)
        {
            product = ProductModule.setMinStockAlert(
                product,
                Microsoft.FSharp.Core.FSharpOption<decimal>.Some(request.MinStockAlert.Value));
        }

        _repository.Save(product, userId);

        return CreatedAtAction(nameof(GetById), new { id = product.Id }, new { product.Id });
    }

    // PUT: api/product/{id}
    [HttpPut("{id}")]
    public IActionResult Update(Guid id, [FromBody] UpdateProductRequest request)
    {
        var userId = GetCurrentUserId();
        var existing = _repository.GetById(id, userId);

        if (existing == null)
            return NotFound();

        var unitOption = UnitOfMeasureModule.fromString(request.Unit);
        var unit = Microsoft.FSharp.Core.OptionModule.IsSome(unitOption)
            ? unitOption.Value
            : existing.Unit;

        var categoryId = request.CategoryId.HasValue
            ? Microsoft.FSharp.Core.FSharpOption<Guid>.Some(request.CategoryId.Value)
            : Microsoft.FSharp.Core.FSharpOption<Guid>.None;

        var productGroupId = request.ProductGroupId.HasValue
            ? Microsoft.FSharp.Core.FSharpOption<Guid>.Some(request.ProductGroupId.Value)
            : Microsoft.FSharp.Core.FSharpOption<Guid>.None;

        var barcode = !string.IsNullOrEmpty(request.Barcode)
            ? Microsoft.FSharp.Core.FSharpOption<string>.Some(request.Barcode)
            : Microsoft.FSharp.Core.FSharpOption<string>.None;

        var minStockAlert = request.MinStockAlert.HasValue
            ? Microsoft.FSharp.Core.FSharpOption<decimal>.Some(request.MinStockAlert.Value)
            : Microsoft.FSharp.Core.FSharpOption<decimal>.None;

        var result = ProductModule.update(
            existing,
            request.Name,
            unit,
            categoryId,
            productGroupId,
            barcode,
            minStockAlert,
            request.IsActive);

        if (result.IsError)
            return BadRequest(result.ErrorValue.ToString());

        _repository.Save(result.ResultValue, userId);

        return NoContent();
    }

    // PATCH: api/product/{id}/stock
    [HttpPatch("{id}/stock")]
    public IActionResult AdjustStock(Guid id, [FromBody] AdjustStockRequest request)
    {
        var userId = GetCurrentUserId();
        var existing = _repository.GetById(id, userId);

        if (existing == null)
            return NotFound();

        _repository.UpdateStock(id, userId, request.QuantityChange);

        return NoContent();
    }

    // PATCH: api/product/{id}/toggle
    [HttpPatch("{id}/toggle")]
    public IActionResult ToggleActive(Guid id)
    {
        var userId = GetCurrentUserId();
        var existing = _repository.GetById(id, userId);

        if (existing == null)
            return NotFound();

        var toggled = ProductModule.toggleActive(existing);
        _repository.Save(toggled, userId);

        return NoContent();
    }
}

// Request DTOs
public record CreateProductRequest(
    string Name,
    string Unit,
    Guid? CategoryId = null,
    Guid? ProductGroupId = null,
    string? Barcode = null,
    decimal? MinStockAlert = null
);

public record UpdateProductRequest(
    string Name,
    string Unit,
    Guid? CategoryId,
    Guid? ProductGroupId,
    string? Barcode,
    decimal? MinStockAlert,
    bool IsActive = true
);

public record AdjustStockRequest(decimal QuantityChange);
