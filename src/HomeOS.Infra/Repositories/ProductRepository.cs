using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.InventoryTypes;
using HomeOS.Infra.DataModels;
using HomeOS.Infra.Mappers;

namespace HomeOS.Infra.Repositories;

public class ProductRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(Product product, Guid userId)
    {
        var dbModel = ProductMapper.ToDbModel(product, userId);

        const string sql = @"
            MERGE [Inventory].[Products] AS target
            USING (SELECT @Id AS Id) AS source
            ON target.Id = source.Id
            WHEN MATCHED THEN
                UPDATE SET 
                    Name = @Name,
                    Unit = @Unit,
                    CategoryId = @CategoryId,
                    ProductGroupId = @ProductGroupId,
                    Barcode = @Barcode,
                    LastPrice = @LastPrice,
                    StockQuantity = @StockQuantity,
                    MinStockAlert = @MinStockAlert,
                    IsActive = @IsActive
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Name, Unit, CategoryId, ProductGroupId, Barcode, LastPrice, StockQuantity, MinStockAlert, IsActive, CreatedAt)
                VALUES (@Id, @UserId, @Name, @Unit, @CategoryId, @ProductGroupId, @Barcode, @LastPrice, @StockQuantity, @MinStockAlert, @IsActive, @CreatedAt);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public Product? GetById(Guid id, Guid userId)
    {
        const string sql = @"
            SELECT Id, UserId, Name, Unit, CategoryId, ProductGroupId, Barcode, LastPrice, StockQuantity, MinStockAlert, IsActive, CreatedAt
            FROM [Inventory].[Products]
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        var dbModel = connection.QueryFirstOrDefault<ProductDbModel>(sql, new { Id = id, UserId = userId });
        return dbModel != null ? ProductMapper.ToDomain(dbModel) : null;
    }

    public IEnumerable<Product> GetAll(Guid userId, bool includeInactive = false)
    {
        var sql = @"
            SELECT Id, UserId, Name, Unit, CategoryId, ProductGroupId, Barcode, LastPrice, StockQuantity, MinStockAlert, IsActive, CreatedAt
            FROM [Inventory].[Products]
            WHERE UserId = @UserId";

        if (!includeInactive)
            sql += " AND IsActive = 1";

        sql += " ORDER BY Name";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        var dbModels = connection.Query<ProductDbModel>(sql, new { UserId = userId });
        return dbModels.Select(ProductMapper.ToDomain);
    }

    public IEnumerable<Product> GetLowStock(Guid userId)
    {
        const string sql = @"
            SELECT Id, UserId, Name, Unit, CategoryId, ProductGroupId, Barcode, LastPrice, StockQuantity, MinStockAlert, IsActive, CreatedAt
            FROM [Inventory].[Products]
            WHERE UserId = @UserId 
              AND IsActive = 1 
              AND MinStockAlert IS NOT NULL 
              AND StockQuantity <= MinStockAlert
            ORDER BY Name";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        var dbModels = connection.Query<ProductDbModel>(sql, new { UserId = userId });
        return dbModels.Select(ProductMapper.ToDomain);
    }

    public void UpdateStock(Guid productId, Guid userId, decimal quantityChange)
    {
        const string sql = @"
            UPDATE [Inventory].[Products]
            SET StockQuantity = StockQuantity + @QuantityChange
            WHERE Id = @ProductId AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, new { ProductId = productId, UserId = userId, QuantityChange = quantityChange });
    }

    public void UpdatePrice(Guid productId, Guid userId, decimal newPrice)
    {
        const string sql = @"
            UPDATE [Inventory].[Products]
            SET LastPrice = @NewPrice
            WHERE Id = @ProductId AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, new { ProductId = productId, UserId = userId, NewPrice = newPrice });
    }
}
