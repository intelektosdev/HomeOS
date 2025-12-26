using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.DataModels;
using HomeOS.Infra.Mappers;

namespace HomeOS.Infra.Repositories;

public class RecurringTransactionRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(RecurringTransaction recurring, Guid userId)
    {
        var dbModel = RecurringTransactionMapper.ToDb(recurring, userId);

        const string sql = @"
            MERGE INTO [Finance].[RecurringTransactions] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id AND Target.UserId = @UserId)
            WHEN MATCHED THEN
                UPDATE SET 
                    Description = @Description,
                    Type = @Type,
                    CategoryId = @CategoryId,
                    AccountId = @AccountId,
                    CreditCardId = @CreditCardId,
                    AmountTypeId = @AmountTypeId,
                    FixedAmount = @FixedAmount,
                    AverageAmount = @AverageAmount,
                    FrequencyId = @FrequencyId,
                    DayOfMonth = @DayOfMonth,
                    StartDate = @StartDate,
                    EndDate = @EndDate,
                    NextOccurrence = @NextOccurrence,
                    IsActive = @IsActive,
                    LastGeneratedAt = @LastGeneratedAt
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Description, Type, CategoryId, AccountId, CreditCardId,
                       AmountTypeId, FixedAmount, AverageAmount, FrequencyId, DayOfMonth,
                       StartDate, EndDate, NextOccurrence, IsActive, CreatedAt, LastGeneratedAt)
                VALUES (@Id, @UserId, @Description, @Type, @CategoryId, @AccountId, @CreditCardId,
                       @AmountTypeId, @FixedAmount, @AverageAmount, @FrequencyId, @DayOfMonth,
                       @StartDate, @EndDate, @NextOccurrence, @IsActive, @CreatedAt, @LastGeneratedAt);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public virtual RecurringTransaction? GetById(Guid id, Guid userId)
    {
        const string sql = @"
            SELECT *
            FROM [Finance].[RecurringTransactions]
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<RecurringTransactionDbModel>(sql, new { Id = id, UserId = userId });

        return dbModel == null ? null : RecurringTransactionMapper.ToDomain(dbModel);
    }

    public IEnumerable<RecurringTransaction> GetAll(Guid userId, bool includeInactive = false)
    {
        var sql = @"
            SELECT *
            FROM [Finance].[RecurringTransactions]
            WHERE UserId = @UserId";

        if (!includeInactive)
        {
            sql += " AND IsActive = 1";
        }

        sql += " ORDER BY NextOccurrence ASC";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<RecurringTransactionDbModel>(sql, new { UserId = userId });

        return dbModels.Select(RecurringTransactionMapper.ToDomain);
    }

    public virtual IEnumerable<RecurringTransaction> GetDueForGeneration(Guid userId, DateTime upToDate)
    {
        const string sql = @"
            SELECT *
            FROM [Finance].[RecurringTransactions]
            WHERE UserId = @UserId
              AND IsActive = 1
              AND NextOccurrence <= @UpToDate
              AND (EndDate IS NULL OR EndDate >= @UpToDate)
            ORDER BY NextOccurrence ASC";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<RecurringTransactionDbModel>(sql, new { UserId = userId, UpToDate = upToDate });

        return dbModels.Select(RecurringTransactionMapper.ToDomain);
    }

    public virtual void UpdateNextOccurrence(Guid id, DateTime nextDate, Guid userId)
    {
        const string sql = @"
            UPDATE [Finance].[RecurringTransactions]
            SET NextOccurrence = @NextDate,
                LastGeneratedAt = GETDATE()
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        connection.Execute(sql, new { Id = id, NextDate = nextDate, UserId = userId });
    }

    public virtual void LinkGeneratedTransaction(Guid transactionId, Guid recurringId)
    {
        const string sql = @"
            INSERT INTO [Finance].[GeneratedTransactions] 
                (TransactionId, RecurringTransactionId, GeneratedAt, WasModified)
            VALUES 
                (@TransactionId, @RecurringTransactionId, GETDATE(), 0)";

        using var connection = new SqlConnection(_connectionString);
        connection.Execute(sql, new { TransactionId = transactionId, RecurringTransactionId = recurringId });
    }

    public void Delete(Guid id, Guid userId)
    {
        const string sql = @"
            DELETE FROM [Finance].[RecurringTransactions]
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        connection.Execute(sql, new { Id = id, UserId = userId });
    }

    public bool IsGenerated(Guid transactionId)
    {
        const string sql = @"
            SELECT COUNT(1)
            FROM [Finance].[GeneratedTransactions]
            WHERE TransactionId = @TransactionId";

        using var connection = new SqlConnection(_connectionString);
        return connection.ExecuteScalar<int>(sql, new { TransactionId = transactionId }) > 0;
    }
}
