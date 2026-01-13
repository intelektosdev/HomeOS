using System;
using System.Collections.Generic;
using System.Linq;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Mappers;
using HomeOS.Infra.DataModels;

namespace HomeOS.Infra.Repositories;

public class TransferRepository
{
    private readonly string _connectionString;

    public TransferRepository(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new Exception("ConnectionString não encontrada");
    }

    public void Save(Transfer transfer)
    {
        var dbModel = TransferMapper.ToDb(transfer);

        const string sql = @"
            MERGE INTO [Finance].[Transfers] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id)
            WHEN MATCHED THEN
                UPDATE SET 
                    Description = @Description,
                    Amount = @Amount,
                    TransferDate = @TransferDate,
                    StatusId = @StatusId,
                    CompletedAt = @CompletedAt,
                    CancelReason = @CancelReason
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, FromAccountId, ToAccountId, Amount, Description, 
                        TransferDate, StatusId, CompletedAt, CancelReason, CreatedAt)
                VALUES (@Id, @UserId, @FromAccountId, @ToAccountId, @Amount, @Description,
                        @TransferDate, @StatusId, @CompletedAt, @CancelReason, @CreatedAt);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public Transfer? GetById(Guid id, Guid userId)
    {
        const string sql = @"
            SELECT * FROM [Finance].[Transfers] 
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<TransferDbModel>(sql, new { Id = id, UserId = userId });

        return dbModel == null ? null : TransferMapper.ToDomain(dbModel);
    }

    public IEnumerable<Transfer> GetByUser(Guid userId, int? year = null, int? month = null)
    {
        var sql = @"
            SELECT * FROM [Finance].[Transfers] 
            WHERE UserId = @UserId";

        if (year.HasValue)
            sql += " AND YEAR(TransferDate) = @Year";
        if (month.HasValue)
            sql += " AND MONTH(TransferDate) = @Month";

        sql += " ORDER BY TransferDate DESC";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<TransferDbModel>(sql, new { UserId = userId, Year = year, Month = month });

        return dbModels.Select(TransferMapper.ToDomain);
    }

    public void Delete(Guid id, Guid userId)
    {
        const string sql = "DELETE FROM [Finance].[Transfers] WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        connection.Execute(sql, new { Id = id, UserId = userId });
    }
}
