using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using HomeOS.Domain.InventoryTypes;
using HomeOS.Infra.Repositories;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/shopping-list")]
[Authorize]
public class ShoppingListController : ControllerBase
{
    private readonly ShoppingListRepository _shoppingListRepository;
    private readonly ProductRepository _productRepository;
    private readonly TransactionRepository _transactionRepository;
    private readonly PurchaseItemRepository _purchaseItemRepository;

    public ShoppingListController(
        ShoppingListRepository shoppingListRepository,
        ProductRepository productRepository,
        TransactionRepository transactionRepository,
        PurchaseItemRepository purchaseItemRepository)
    {
        _shoppingListRepository = shoppingListRepository;
        _productRepository = productRepository;
        _transactionRepository = transactionRepository;
        _purchaseItemRepository = purchaseItemRepository;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

    // GET: api/shopping-list
    [HttpGet]
    public IActionResult GetPending()
    {
        var userId = GetCurrentUserId();
        var items = _shoppingListRepository.GetPending(userId);

        var response = items.Select(item => new
        {
            item.Id,
            ProductId = Microsoft.FSharp.Core.OptionModule.IsSome(item.ProductId) ? item.ProductId.Value : (Guid?)null,
            item.Name,
            item.Quantity,
            Unit = Microsoft.FSharp.Core.OptionModule.IsSome(item.Unit)
                ? UnitOfMeasureModule.toString(item.Unit.Value)
                : null,
            EstimatedPrice = Microsoft.FSharp.Core.OptionModule.IsSome(item.EstimatedPrice) ? item.EstimatedPrice.Value : (decimal?)null,
            item.IsPurchased,
            item.CreatedAt
        });

        return Ok(response);
    }

    // POST: api/shopping-list
    [HttpPost]
    public IActionResult AddItem([FromBody] AddShoppingListItemRequest request)
    {
        var userId = GetCurrentUserId();

        ShoppingListItem item;

        if (request.ProductId.HasValue)
        {
            // Add from existing product
            var product = _productRepository.GetById(request.ProductId.Value, userId);
            if (product == null)
                return BadRequest("Produto não encontrado");

            var result = ShoppingListModule.createFromProduct(product, request.Quantity);
            if (result.IsError)
                return BadRequest(result.ErrorValue.ToString());

            item = result.ResultValue;
        }
        else
        {
            // Add custom item
            var unitOption = !string.IsNullOrEmpty(request.Unit)
                ? UnitOfMeasureModule.fromString(request.Unit)
                : Microsoft.FSharp.Core.FSharpOption<UnitOfMeasure>.None;

            var result = ShoppingListModule.createCustomItem(request.Name!, request.Quantity, unitOption);
            if (result.IsError)
                return BadRequest(result.ErrorValue.ToString());

            item = result.ResultValue;
        }

        _shoppingListRepository.Save(item, userId);

        return CreatedAtAction(nameof(GetPending), new { }, new { item.Id });
    }

    // DELETE: api/shopping-list/{id}
    [HttpDelete("{id}")]
    public IActionResult RemoveItem(Guid id)
    {
        var userId = GetCurrentUserId();
        var existing = _shoppingListRepository.GetById(id, userId);

        if (existing == null)
            return NotFound();

        _shoppingListRepository.Delete(id, userId);

        return NoContent();
    }

    // PATCH: api/shopping-list/{id}/purchased
    [HttpPatch("{id}/purchased")]
    public IActionResult MarkAsPurchased(Guid id)
    {
        var userId = GetCurrentUserId();
        var existing = _shoppingListRepository.GetById(id, userId);

        if (existing == null)
            return NotFound();

        _shoppingListRepository.MarkAsPurchased(id, userId);

        return NoContent();
    }

    // POST: api/shopping-list/checkout
    [HttpPost("checkout")]
    public IActionResult Checkout([FromBody] CheckoutRequest request)
    {
        var userId = GetCurrentUserId();

        if (request.Items == null || !request.Items.Any())
            return BadRequest("Nenhum item para checkout");

        // Calculate total
        var total = request.Items.Sum(i => i.Quantity * i.UnitPrice);

        // Create transaction
        var source = request.AccountId.HasValue
            ? HomeOS.Domain.FinancialTypes.TransactionSource.NewFromAccount(request.AccountId.Value)
            : HomeOS.Domain.FinancialTypes.TransactionSource.NewFromCreditCard(request.CreditCardId!.Value);

        var transactionResult = HomeOS.Domain.FinancialTypes.TransactionModule.createExpense(
            request.Description ?? "Compras",
            total,
            request.PurchaseDate,
            request.CategoryId,
            source
        );

        if (transactionResult.IsError)
            return BadRequest(transactionResult.ErrorValue.ToString());

        var transaction = transactionResult.ResultValue;
        _transactionRepository.Save(transaction, userId);

        // Process items
        foreach (var checkoutItem in request.Items)
        {
            var productId = checkoutItem.ProductId;

            // Handle ad-hoc items (create new product)
            if (!productId.HasValue)
            {
                if (string.IsNullOrEmpty(checkoutItem.Name))
                    return BadRequest("Nome do produto é obrigatório para novos itens");

                var unit = !string.IsNullOrEmpty(checkoutItem.Unit)
                   ? UnitOfMeasureModule.fromString(checkoutItem.Unit)
                   : Microsoft.FSharp.Core.FSharpOption<UnitOfMeasure>.None;

                var finalUnit = Microsoft.FSharp.Core.OptionModule.IsSome(unit) ? unit.Value : UnitOfMeasure.Unit;

                var productResult = ProductModule.create(
                    checkoutItem.Name,
                    finalUnit,
                    Microsoft.FSharp.Core.FSharpOption<Guid>.None, // Category
                    Microsoft.FSharp.Core.FSharpOption<Guid>.None, // Group
                    Microsoft.FSharp.Core.FSharpOption<string>.None // Barcode
                );

                if (productResult.IsOk)
                {
                    var newProduct = productResult.ResultValue;
                    _productRepository.Save(newProduct, userId);
                    productId = newProduct.Id;
                }
                else
                {
                    return BadRequest($"Erro ao criar produto {checkoutItem.Name}: {productResult.ErrorValue}");
                }
            }

            // Create PurchaseItem
            var supplierId = request.SupplierId.HasValue
                ? Microsoft.FSharp.Core.FSharpOption<Guid>.Some(request.SupplierId.Value)
                : Microsoft.FSharp.Core.FSharpOption<Guid>.None;

            var purchaseItemResult = PurchaseItemModule.create(
                productId.Value,
                transaction.Id,
                supplierId,
                checkoutItem.Quantity,
                checkoutItem.UnitPrice,
                request.PurchaseDate
            );

            if (purchaseItemResult.IsOk)
            {
                var purchaseItem = purchaseItemResult.ResultValue;
                _purchaseItemRepository.Save(purchaseItem, userId);

                // Update product stock and price
                _productRepository.UpdateStock(productId.Value, userId, checkoutItem.Quantity);
                _productRepository.UpdatePrice(productId.Value, userId, checkoutItem.UnitPrice);
            }

            // Mark shopping list item as purchased
            if (checkoutItem.ShoppingListItemId.HasValue)
            {
                _shoppingListRepository.MarkAsPurchased(checkoutItem.ShoppingListItemId.Value, userId);
            }
        }

        return Ok(new
        {
            TransactionId = transaction.Id,
            Total = total,
            ItemCount = request.Items.Count
        });
    }

    // DELETE: api/shopping-list/clear-purchased
    [HttpDelete("clear-purchased")]
    public IActionResult ClearPurchased()
    {
        var userId = GetCurrentUserId();
        _shoppingListRepository.ClearPurchased(userId);
        return NoContent();
    }
}

// Request DTOs
public record AddShoppingListItemRequest(
    Guid? ProductId,
    string? Name,
    decimal Quantity = 1,
    string? Unit = null
);

public record CheckoutRequest(
    List<CheckoutItemRequest> Items,
    Guid CategoryId,
    Guid? AccountId,
    Guid? CreditCardId,
    Guid? SupplierId,
    DateTime PurchaseDate,
    string? Description
);

public record CheckoutItemRequest(
    Guid? ProductId,
    string? Name,
    string? Unit,
    Guid? ShoppingListItemId,
    decimal Quantity,
    decimal UnitPrice
);
