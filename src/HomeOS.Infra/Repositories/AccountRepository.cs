using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Mappers;
using HomeOS.Infra.DataModels;
using System.Collections.Generic;

namespace HomeOS.Infra.Repositories;

public class AccountRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(Account account)
    {
        var dbModel = AccountMapper.ToDb(account);

        const string sql = @"
            MERGE INTO [Finance].[Accounts] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id)
            WHEN MATCHED THEN
                UPDATE SET 
                    Name = @Name,
                    Type = @Type,
                    InitialBalance = @InitialBalance,
                    IsActive = @IsActive
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Name, Type, InitialBalance, IsActive)
                VALUES (@Id, @UserId, @Name, @Type, @InitialBalance, @IsActive);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public Account? GetById(Guid id)
    {
        const string sql = "SELECT * FROM [Finance].[Accounts] WHERE Id = @Id";
        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<AccountDbModel>(sql, new { Id = id });

        return dbModel == null ? null : AccountMapper.ToDomain(dbModel);
    }

    public IEnumerable<Account> GetAll()
    {
        const string sql = "SELECT * FROM [Finance].[Accounts]";
        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<AccountDbModel>(sql);

        return dbModels.Select(AccountMapper.ToDomain);
    }
}
