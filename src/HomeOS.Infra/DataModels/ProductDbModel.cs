namespace HomeOS.Infra.DataModels;

public class ProductDbModel
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Unit { get; set; } = "un";
    public Guid? CategoryId { get; set; }
    public Guid? ProductGroupId { get; set; }
    public string? Barcode { get; set; }
    public decimal? LastPrice { get; set; }
    public decimal StockQuantity { get; set; }
    public decimal? MinStockAlert { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}
