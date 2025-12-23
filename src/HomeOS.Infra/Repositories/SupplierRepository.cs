using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.InventoryTypes;
using HomeOS.Infra.DataModels;
using HomeOS.Infra.Mappers;

namespace HomeOS.Infra.Repositories;

public class SupplierRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(Supplier supplier, Guid userId)
    {
        var dbModel = SupplierMapper.ToDbModel(supplier, userId);

        const string sql = @"
            MERGE [Inventory].[Suppliers] AS target
            USING (SELECT @Id AS Id) AS source
            ON target.Id = source.Id
            WHEN MATCHED THEN
                UPDATE SET 
                    Name = @Name,
                    Email = @Email,
                    Phone = @Phone
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Name, Email, Phone, CreatedAt)
                VALUES (@Id, @UserId, @Name, @Email, @Phone, @CreatedAt);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public Supplier? GetById(Guid id, Guid userId)
    {
        const string sql = @"
            SELECT Id, UserId, Name, Email, Phone, CreatedAt
            FROM [Inventory].[Suppliers]
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        var dbModel = connection.QueryFirstOrDefault<SupplierDbModel>(sql, new { Id = id, UserId = userId });
        return dbModel != null ? SupplierMapper.ToDomain(dbModel) : null;
    }

    public IEnumerable<Supplier> GetAll(Guid userId)
    {
        const string sql = @"
            SELECT Id, UserId, Name, Email, Phone, CreatedAt
            FROM [Inventory].[Suppliers]
            WHERE UserId = @UserId
            ORDER BY Name";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        var dbModels = connection.Query<SupplierDbModel>(sql, new { UserId = userId });
        return dbModels.Select(SupplierMapper.ToDomain);
    }
}
