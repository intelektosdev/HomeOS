using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.InventoryTypes;
using HomeOS.Infra.DataModels;
using HomeOS.Infra.Mappers;

namespace HomeOS.Infra.Repositories;

public class ShoppingListRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(ShoppingListItem item, Guid userId)
    {
        var dbModel = ShoppingListItemMapper.ToDbModel(item, userId);

        const string sql = @"
            MERGE [Inventory].[ShoppingListItems] AS target
            USING (SELECT @Id AS Id) AS source
            ON target.Id = source.Id
            WHEN MATCHED THEN
                UPDATE SET 
                    ProductId = @ProductId,
                    Name = @Name,
                    Quantity = @Quantity,
                    Unit = @Unit,
                    EstimatedPrice = @EstimatedPrice,
                    IsPurchased = @IsPurchased,
                    PurchasedAt = @PurchasedAt
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, ProductId, Name, Quantity, Unit, EstimatedPrice, IsPurchased, CreatedAt, PurchasedAt)
                VALUES (@Id, @UserId, @ProductId, @Name, @Quantity, @Unit, @EstimatedPrice, @IsPurchased, @CreatedAt, @PurchasedAt);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public ShoppingListItem? GetById(Guid id, Guid userId)
    {
        const string sql = @"
            SELECT Id, UserId, ProductId, Name, Quantity, Unit, EstimatedPrice, IsPurchased, CreatedAt, PurchasedAt
            FROM [Inventory].[ShoppingListItems]
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        var dbModel = connection.QueryFirstOrDefault<ShoppingListItemDbModel>(sql, new { Id = id, UserId = userId });
        return dbModel != null ? ShoppingListItemMapper.ToDomain(dbModel) : null;
    }

    public IEnumerable<ShoppingListItem> GetPending(Guid userId)
    {
        const string sql = @"
            SELECT Id, UserId, ProductId, Name, Quantity, Unit, EstimatedPrice, IsPurchased, CreatedAt, PurchasedAt
            FROM [Inventory].[ShoppingListItems]
            WHERE UserId = @UserId AND IsPurchased = 0
            ORDER BY CreatedAt DESC";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        var dbModels = connection.Query<ShoppingListItemDbModel>(sql, new { UserId = userId });
        return dbModels.Select(ShoppingListItemMapper.ToDomain);
    }

    public IEnumerable<ShoppingListItem> GetAll(Guid userId)
    {
        const string sql = @"
            SELECT Id, UserId, ProductId, Name, Quantity, Unit, EstimatedPrice, IsPurchased, CreatedAt, PurchasedAt
            FROM [Inventory].[ShoppingListItems]
            WHERE UserId = @UserId
            ORDER BY IsPurchased, CreatedAt DESC";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        var dbModels = connection.Query<ShoppingListItemDbModel>(sql, new { UserId = userId });
        return dbModels.Select(ShoppingListItemMapper.ToDomain);
    }

    public void Delete(Guid id, Guid userId)
    {
        const string sql = @"
            DELETE FROM [Inventory].[ShoppingListItems]
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, new { Id = id, UserId = userId });
    }

    public void MarkAsPurchased(Guid id, Guid userId)
    {
        const string sql = @"
            UPDATE [Inventory].[ShoppingListItems]
            SET IsPurchased = 1, PurchasedAt = SYSUTCDATETIME()
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, new { Id = id, UserId = userId });
    }

    public void ClearPurchased(Guid userId)
    {
        const string sql = @"
            DELETE FROM [Inventory].[ShoppingListItems]
            WHERE UserId = @UserId AND IsPurchased = 1";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, new { UserId = userId });
    }
}
