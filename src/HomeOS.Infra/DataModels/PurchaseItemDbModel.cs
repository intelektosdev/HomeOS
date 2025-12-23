namespace HomeOS.Infra.DataModels;

public class PurchaseItemDbModel
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ProductId { get; set; }
    public Guid TransactionId { get; set; }
    public Guid? SupplierId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }  // Computed column in DB
    public DateTime PurchaseDate { get; set; }
}
