using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using HomeOS.Domain.InventoryTypes;
using HomeOS.Infra.Repositories;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/shopping-list")]
// [Authorize] // Disabled for local development
public class ShoppingListController : ControllerBase
{
    private readonly ShoppingListRepository _shoppingListRepository;
    private readonly ProductRepository _productRepository;
    private readonly TransactionRepository _transactionRepository;
    private readonly PurchaseItemRepository _purchaseItemRepository;
    private readonly CreditCardTransactionRepository _ccTransactionRepository;

    public ShoppingListController(
        ShoppingListRepository shoppingListRepository,
        ProductRepository productRepository,
        TransactionRepository transactionRepository,
        PurchaseItemRepository purchaseItemRepository,
        CreditCardTransactionRepository ccTransactionRepository)
    {
        _shoppingListRepository = shoppingListRepository;
        _productRepository = productRepository;
        _transactionRepository = transactionRepository;
        _purchaseItemRepository = purchaseItemRepository;
        _ccTransactionRepository = ccTransactionRepository;
    }

    // Fixed userId for local development without authentication
    private static readonly Guid FixedUserId = Guid.Parse("22f4bd46-313d-424a-83b9-0c367ad46c3b");

    private Guid GetCurrentUserId()
    {
        return FixedUserId;
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

        // Validate Installments
        var installments = request.InstallmentCount ?? 1;
        if (installments > 1 && !request.CreditCardId.HasValue)
        {
            return BadRequest("Parcelamento disponível apenas para Cartão de Crédito.");
        }

        // Calculate total
        var total = request.Items.Sum(i => i.Quantity * i.UnitPrice);
        string description = request.Description ?? "Compras";

        HomeOS.Domain.FinancialTypes.TransactionSource source;
        if (request.AccountId.HasValue)
        {
            source = HomeOS.Domain.FinancialTypes.TransactionSource.NewFromAccount(request.AccountId.Value);
        }
        else if (request.CreditCardId.HasValue)
        {
            source = HomeOS.Domain.FinancialTypes.TransactionSource.NewFromCreditCard(request.CreditCardId.Value);
        }
        else
        {
            return BadRequest("Informe Conta ou Cartão de Crédito.");
        }

        Guid? transactionIdToLink = null;

        // Handle Transaction Creation (Single or Installments)
        if (request.CreditCardId.HasValue)
        {
            // --- CREDIT CARD TRANSACTION FLOW ---
            decimal installmentValue = Math.Floor(total / installments * 100) / 100;
            decimal remainder = total - (installmentValue * installments);
            var installmentId = installments > 1 ? Microsoft.FSharp.Core.FSharpOption<Guid>.Some(Guid.NewGuid()) : Microsoft.FSharp.Core.FSharpOption<Guid>.None;
            var totalInstallmentsOpt = installments > 1 ? Microsoft.FSharp.Core.FSharpOption<int>.Some(installments) : Microsoft.FSharp.Core.FSharpOption<int>.None;

            for (int i = 0; i < installments; i++)
            {
                decimal currentAmount = installmentValue + (i == 0 ? remainder : 0);
                DateTime currentDueDate = request.PurchaseDate.AddMonths(i);
                var installmentDesc = installments > 1 ? $"{description} ({i + 1}/{installments})" : description;

                var installmentNumOpt = installments > 1 ? Microsoft.FSharp.Core.FSharpOption<int>.Some(i + 1) : Microsoft.FSharp.Core.FSharpOption<int>.None;

                var ccTransaction = new HomeOS.Domain.FinancialTypes.CreditCardTransaction(
                    Guid.NewGuid(),
                    request.CreditCardId.Value,
                    userId,
                    request.CategoryId,
                    installmentDesc,
                    currentAmount,
                    currentDueDate, // TransactionDate
                    DateTime.Now,   // CreatedAt
                    HomeOS.Domain.FinancialTypes.CreditCardTransactionStatus.Open,
                    installmentId,
                    installmentNumOpt,
                    totalInstallmentsOpt,
                    Microsoft.FSharp.Core.FSharpOption<Guid>.None, // BillPaymentId
                    Microsoft.FSharp.Core.FSharpOption<Guid>.None  // ProductId
                );

                _ccTransactionRepository.Save(ccTransaction);

                // Link relevant items to the FIRST transaction
                if (i == 0) transactionIdToLink = ccTransaction.Id;
            }
        }
        else
        {
            // --- BANK ACCOUNT TRANSACTION FLOW ---
            // Single Transaction (Installments not supported on Bank Account directly in this flow)
            
            var transactionResult = HomeOS.Domain.FinancialTypes.TransactionModule.createExpense(
               description,
               total,
               request.PurchaseDate,
               request.CategoryId,
               source
           );

            if (transactionResult.IsError)
                return BadRequest(transactionResult.ErrorValue.ToString());

            var transaction = transactionResult.ResultValue;
            _transactionRepository.Save(transaction, userId);
            transactionIdToLink = transaction.Id;
        }


        // Process items (Linked to the first transaction/single transaction)
        if (transactionIdToLink.HasValue)
        {
            foreach (var checkoutItem in request.Items)
            {
                var productId = checkoutItem.ProductId;

                // Handle ad-hoc items
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
                        Microsoft.FSharp.Core.FSharpOption<Guid>.None,
                        Microsoft.FSharp.Core.FSharpOption<Guid>.None,
                        Microsoft.FSharp.Core.FSharpOption<string>.None
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
                    transactionIdToLink.Value,
                    supplierId,
                    checkoutItem.Quantity,
                    checkoutItem.UnitPrice,
                    request.PurchaseDate
                );

                if (purchaseItemResult.IsOk)
                {
                    var purchaseItem = purchaseItemResult.ResultValue;
                    _purchaseItemRepository.Save(purchaseItem, userId);

                    _productRepository.UpdateStock(productId.Value, userId, checkoutItem.Quantity);
                    _productRepository.UpdatePrice(productId.Value, userId, checkoutItem.UnitPrice);
                }

                if (checkoutItem.ShoppingListItemId.HasValue)
                {
                    _shoppingListRepository.MarkAsPurchased(checkoutItem.ShoppingListItemId.Value, userId);
                }
            }
        }

        return Ok(new
        {
            TransactionId = transactionIdToLink,
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
    string? Description,
    int? InstallmentCount
);

public record CheckoutItemRequest(
    Guid? ProductId,
    string? Name,
    string? Unit,
    Guid? ShoppingListItemId,
    decimal Quantity,
    decimal UnitPrice
);
