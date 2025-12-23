namespace HomeOS.Infra.DataModels;

public class ShoppingListItemDbModel
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Quantity { get; set; } = 1;
    public string? Unit { get; set; }
    public decimal? EstimatedPrice { get; set; }
    public bool IsPurchased { get; set; } = false;
    public DateTime CreatedAt { get; set; }
    public DateTime? PurchasedAt { get; set; }
}
