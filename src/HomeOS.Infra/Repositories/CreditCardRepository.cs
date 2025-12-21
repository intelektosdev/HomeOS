using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Mappers;
using HomeOS.Infra.DataModels;
using System.Collections.Generic;

namespace HomeOS.Infra.Repositories;

public class CreditCardRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(CreditCard card)
    {
        var dbModel = CreditCardMapper.ToDb(card);

        const string sql = @"
            MERGE INTO [Finance].[CreditCards] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id)
            WHEN MATCHED THEN
                UPDATE SET 
                    Name = @Name,
                    ClosingDay = @ClosingDay,
                    DueDay = @DueDay,
                    Limit = @Limit
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Name, ClosingDay, DueDay, Limit)
                VALUES (@Id, @UserId, @Name, @ClosingDay, @DueDay, @Limit);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public CreditCard? GetById(Guid id)
    {
        const string sql = "SELECT * FROM [Finance].[CreditCards] WHERE Id = @Id";
        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<CreditCardDbModel>(sql, new { Id = id });

        return dbModel == null ? null : CreditCardMapper.ToDomain(dbModel);
    }

    public IEnumerable<CreditCard> GetAll()
    {
        const string sql = "SELECT * FROM [Finance].[CreditCards]";
        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<CreditCardDbModel>(sql);

        return dbModels.Select(CreditCardMapper.ToDomain);
    }
}
