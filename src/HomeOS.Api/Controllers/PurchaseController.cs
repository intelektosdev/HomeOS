using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using HomeOS.Infra.Repositories;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PurchaseController : ControllerBase
{
    private readonly PurchaseItemRepository _purchaseItemRepository;
    private readonly ProductRepository _productRepository;

    public PurchaseController(
        PurchaseItemRepository purchaseItemRepository,
        ProductRepository productRepository)
    {
        _purchaseItemRepository = purchaseItemRepository;
        _productRepository = productRepository;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

    // GET: api/purchase/by-transaction/{transactionId}
    [HttpGet("by-transaction/{transactionId}")]
    public IActionResult GetByTransaction(Guid transactionId)
    {
        var userId = GetCurrentUserId();
        var items = _purchaseItemRepository.GetByTransaction(transactionId, userId);

        var response = items.Select(item =>
        {
            var product = _productRepository.GetById(item.ProductId, userId);
            return new
            {
                item.Id,
                item.ProductId,
                ProductName = product?.Name ?? "Produto não encontrado",
                item.Quantity,
                item.UnitPrice,
                TotalPrice = item.Quantity * item.UnitPrice,
                item.PurchaseDate
            };
        });

        return Ok(response);
    }

    // GET: api/purchase/by-product/{productId}
    [HttpGet("by-product/{productId}")]
    public IActionResult GetByProduct(Guid productId, [FromQuery] int limit = 10)
    {
        var userId = GetCurrentUserId();
        var items = _purchaseItemRepository.GetByProduct(productId, userId, limit);

        var response = items.Select(item => new
        {
            item.Id,
            item.TransactionId,
            item.Quantity,
            item.UnitPrice,
            TotalPrice = item.Quantity * item.UnitPrice,
            item.PurchaseDate
        });

        return Ok(response);
    }

    // GET: api/purchase/history
    [HttpGet("history")]
    public IActionResult GetHistory([FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        var userId = GetCurrentUserId();
        var fromDate = from ?? DateTime.UtcNow.AddMonths(-1);
        var toDate = to ?? DateTime.UtcNow;

        var items = _purchaseItemRepository.GetRecentPurchases(userId, fromDate, toDate);

        var response = items.Select(i => new
        {
            i.Item.Id,
            i.Item.ProductId,
            i.ProductName,
            i.Item.TransactionId,
            i.Item.Quantity,
            i.Item.UnitPrice,
            i.Item.TotalPrice,
            i.Item.PurchaseDate
        });

        return Ok(response);
    }
}
