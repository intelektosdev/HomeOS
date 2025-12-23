using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.InventoryTypes;
using HomeOS.Infra.DataModels;
using HomeOS.Infra.Mappers;

namespace HomeOS.Infra.Repositories;

public class ProductGroupRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(ProductGroup group, Guid userId)
    {
        var dbModel = ProductGroupMapper.ToDbModel(group, userId);

        const string sql = @"
            MERGE [Inventory].[ProductGroups] AS target
            USING (SELECT @Id AS Id) AS source
            ON target.Id = source.Id
            WHEN MATCHED THEN
                UPDATE SET 
                    Name = @Name,
                    Description = @Description
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Name, Description, CreatedAt)
                VALUES (@Id, @UserId, @Name, @Description, @CreatedAt);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public ProductGroup? GetById(Guid id, Guid userId)
    {
        const string sql = @"
            SELECT Id, UserId, Name, Description, CreatedAt
            FROM [Inventory].[ProductGroups]
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        var dbModel = connection.QueryFirstOrDefault<ProductGroupDbModel>(sql, new { Id = id, UserId = userId });
        return dbModel != null ? ProductGroupMapper.ToDomain(dbModel) : null;
    }

    public IEnumerable<ProductGroup> GetAll(Guid userId)
    {
        const string sql = @"
            SELECT Id, UserId, Name, Description, CreatedAt
            FROM [Inventory].[ProductGroups]
            WHERE UserId = @UserId
            ORDER BY Name";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        var dbModels = connection.Query<ProductGroupDbModel>(sql, new { UserId = userId });
        return dbModels.Select(ProductGroupMapper.ToDomain);
    }
}
