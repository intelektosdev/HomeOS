using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Mappers;
using HomeOS.Infra.DataModels;
using System.Collections.Generic;

namespace HomeOS.Infra.Repositories;

public class CategoryRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(Category category)
    {
        var dbModel = CategoryMapper.ToDb(category);

        const string sql = @"
            MERGE INTO [Finance].[Categories] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id)
            WHEN MATCHED THEN
                UPDATE SET 
                    Name = @Name,
                    Type = @Type,
                    Icon = @Icon
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Name, Type, Icon)
                VALUES (@Id, @UserId, @Name, @Type, @Icon);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public Category? GetById(Guid id)
    {
        const string sql = "SELECT * FROM [Finance].[Categories] WHERE Id = @Id";
        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<CategoryDbModel>(sql, new { Id = id });

        return dbModel == null ? null : CategoryMapper.ToDomain(dbModel);
    }

    public IEnumerable<Category> GetAll()
    {
        // TODO: Filtrar por UserId no futuro
        const string sql = "SELECT * FROM [Finance].[Categories]";
        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<CategoryDbModel>(sql);

        return dbModels.Select(CategoryMapper.ToDomain);
    }
}
