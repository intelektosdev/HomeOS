using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.InventoryTypes;
using HomeOS.Infra.DataModels;
using HomeOS.Infra.Mappers;

namespace HomeOS.Infra.Repositories;

public class PurchaseItemRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(PurchaseItem item, Guid userId)
    {
        var dbModel = PurchaseItemMapper.ToDbModel(item, userId);

        const string sql = @"
            INSERT INTO [Inventory].[PurchaseItems] (Id, UserId, ProductId, TransactionId, SupplierId, Quantity, UnitPrice, PurchaseDate)
            VALUES (@Id, @UserId, @ProductId, @TransactionId, @SupplierId, @Quantity, @UnitPrice, @PurchaseDate)";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public void SaveMany(IEnumerable<PurchaseItem> items, Guid userId)
    {
        using var connection = new SqlConnection(_connectionString);
        connection.Open();

        const string sql = @"
            INSERT INTO [Inventory].[PurchaseItems] (Id, UserId, ProductId, TransactionId, SupplierId, Quantity, UnitPrice, PurchaseDate)
            VALUES (@Id, @UserId, @ProductId, @TransactionId, @SupplierId, @Quantity, @UnitPrice, @PurchaseDate)";

        foreach (var item in items)
        {
            var dbModel = PurchaseItemMapper.ToDbModel(item, userId);
            connection.Execute(sql, dbModel);
        }
    }

    public IEnumerable<PurchaseItem> GetByTransaction(Guid transactionId, Guid userId)
    {
        const string sql = @"
            SELECT Id, UserId, ProductId, TransactionId, SupplierId, Quantity, UnitPrice, TotalPrice, PurchaseDate
            FROM [Inventory].[PurchaseItems]
            WHERE TransactionId = @TransactionId AND UserId = @UserId
            ORDER BY Id";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        var dbModels = connection.Query<PurchaseItemDbModel>(sql, new { TransactionId = transactionId, UserId = userId });
        return dbModels.Select(PurchaseItemMapper.ToDomain);
    }

    public IEnumerable<PurchaseItem> GetByProduct(Guid productId, Guid userId, int limit = 10)
    {
        const string sql = @"
            SELECT TOP (@Limit) Id, UserId, ProductId, TransactionId, SupplierId, Quantity, UnitPrice, TotalPrice, PurchaseDate
            FROM [Inventory].[PurchaseItems]
            WHERE ProductId = @ProductId AND UserId = @UserId
            ORDER BY PurchaseDate DESC";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        var dbModels = connection.Query<PurchaseItemDbModel>(sql, new { ProductId = productId, UserId = userId, Limit = limit });
        return dbModels.Select(PurchaseItemMapper.ToDomain);
    }

    public IEnumerable<(PurchaseItemDbModel Item, string ProductName)> GetRecentPurchases(Guid userId, DateTime fromDate, DateTime toDate)
    {
        const string sql = @"
            SELECT pi.Id, pi.UserId, pi.ProductId, pi.TransactionId, pi.SupplierId, pi.Quantity, pi.UnitPrice, pi.TotalPrice, pi.PurchaseDate,
                   p.Name as ProductName
            FROM [Inventory].[PurchaseItems] pi
            INNER JOIN [Inventory].[Products] p ON pi.ProductId = p.Id
            WHERE pi.UserId = @UserId 
              AND pi.PurchaseDate >= @FromDate 
              AND pi.PurchaseDate <= @ToDate
            ORDER BY pi.PurchaseDate DESC";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        var results = connection.Query<PurchaseItemDbModel, string, (PurchaseItemDbModel, string)>(
            sql,
            (item, productName) => (item, productName),
            new { UserId = userId, FromDate = fromDate, ToDate = toDate },
            splitOn: "ProductName"
        );
        return results;
    }
}
