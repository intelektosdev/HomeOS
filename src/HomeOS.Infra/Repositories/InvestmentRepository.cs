using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.InvestmentTypes;
using HomeOS.Infra.Mappers;
using HomeOS.Infra.DataModels;

namespace HomeOS.Infra.Repositories;

public class InvestmentRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(Investment investment)
    {
        var dbModel = InvestmentMapper.ToDb(investment);

        const string sql = @"
            MERGE INTO [Finance].[Investments] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id)
            WHEN MATCHED THEN
                UPDATE SET 
                    Name = @Name,
                    CurrentQuantity = @CurrentQuantity,
                    AveragePrice = @AveragePrice,
                    CurrentPrice = @CurrentPrice,
                    MaturityDate = @MaturityDate,
                    AnnualYield = @AnnualYield,
                    Status = @Status,
                    LinkedAccountId = @LinkedAccountId,
                    Notes = @Notes,
                    UpdatedAt = @UpdatedAt
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Name, Type, InitialAmount, CurrentQuantity, AveragePrice, 
                        CurrentPrice, InvestmentDate, MaturityDate, AnnualYield, Status, 
                        LinkedAccountId, Notes, CreatedAt, UpdatedAt)
                VALUES (@Id, @UserId, @Name, @Type, @InitialAmount, @CurrentQuantity, @AveragePrice,
                        @CurrentPrice, @InvestmentDate, @MaturityDate, @AnnualYield, @Status,
                        @LinkedAccountId, @Notes, @CreatedAt, @UpdatedAt);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public Investment? GetById(Guid id, Guid userId)
    {
        const string sql = @"
            SELECT * 
            FROM [Finance].[Investments]
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<InvestmentDataModel>(sql, new { Id = id, UserId = userId });

        if (dbModel == null) return null;
        return InvestmentMapper.ToDomain(dbModel);
    }

    public IEnumerable<Investment> GetAllByUser(Guid userId)
    {
        const string sql = @"
            SELECT * 
            FROM [Finance].[Investments]
            WHERE UserId = @UserId
            ORDER BY InvestmentDate DESC";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<InvestmentDataModel>(sql, new { UserId = userId });

        return dbModels.Select(InvestmentMapper.ToDomain);
    }

    public IEnumerable<Investment> GetActiveInvestments(Guid userId)
    {
        const string sql = @"
            SELECT * 
            FROM [Finance].[Investments]
            WHERE UserId = @UserId
                AND JSON_VALUE(Status, '$.Case') = 'Active'
            ORDER BY (CurrentPrice * CurrentQuantity) DESC";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<InvestmentDataModel>(sql, new { UserId = userId });

        return dbModels.Select(InvestmentMapper.ToDomain);
    }

    public IEnumerable<Investment> GetInvestmentsByType(Guid userId, string investmentType)
    {
        // investmentType: "Stock", "FixedIncome", etc
        const string sql = @"
            SELECT * 
            FROM [Finance].[Investments]
            WHERE UserId = @UserId
                AND JSON_VALUE(Type, '$.Case') = @InvestmentType
            ORDER BY InvestmentDate DESC";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<InvestmentDataModel>(sql, new { UserId = userId, InvestmentType = investmentType });

        return dbModels.Select(InvestmentMapper.ToDomain);
    }

    public void Delete(Guid id, Guid userId)
    {
        const string sql = @"
            DELETE FROM [Finance].[Investments]
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        connection.Execute(sql, new { Id = id, UserId = userId });
    }

    // Métodos para InvestmentTransactions
    public void SaveTransaction(InvestmentTransaction transaction)
    {
        var dbModel = InvestmentMapper.ToDb(transaction);

        const string sql = @"
            INSERT INTO [Finance].[InvestmentTransactions] 
            (Id, InvestmentId, Type, Date, Quantity, UnitPrice, TotalAmount, Fees, FinancialTransactionId, CreatedAt)
            VALUES 
            (@Id, @InvestmentId, @Type, @Date, @Quantity, @UnitPrice, @TotalAmount, @Fees, @FinancialTransactionId, @CreatedAt);";

        using var connection = new SqlConnection(_connectionString);
        connection.Execute(sql, dbModel);
    }

    public IEnumerable<InvestmentTransaction> GetTransactions(Guid investmentId)
    {
        const string sql = @"
            SELECT * 
            FROM [Finance].[InvestmentTransactions]
            WHERE InvestmentId = @InvestmentId
            ORDER BY Date DESC";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<InvestmentTransactionDataModel>(sql, new { InvestmentId = investmentId });

        return dbModels.Select(InvestmentMapper.TransactionToDomain);
    }

    public IEnumerable<InvestmentTransaction> GetTransactionsByType(Guid investmentId, string transactionType)
    {
        const string sql = @"
            SELECT * 
            FROM [Finance].[InvestmentTransactions]
            WHERE InvestmentId = @InvestmentId
                AND Type = @TransactionType
            ORDER BY Date DESC";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<InvestmentTransactionDataModel>(
            sql,
            new { InvestmentId = investmentId, TransactionType = transactionType }
        );

        return dbModels.Select(InvestmentMapper.TransactionToDomain);
    }

    // Estatísticas e Portfolio
    public dynamic GetPortfolioSummary(Guid userId)
    {
        const string sql = @"
            SELECT 
                COUNT(*) as TotalInvestments,
                SUM(InitialAmount) as TotalInvested,
                SUM(CurrentPrice * CurrentQuantity) as CurrentValue,
                SUM((CurrentPrice * CurrentQuantity) - InitialAmount) as TotalReturn
            FROM [Finance].[Investments]
            WHERE UserId = @UserId
                AND JSON_VALUE(Status, '$.Case') = 'Active'";

        using var connection = new SqlConnection(_connectionString);
        var summary = connection.QuerySingleOrDefault<dynamic>(sql, new { UserId = userId });

        return summary ?? new
        {
            TotalInvestments = 0,
            TotalInvested = 0m,
            CurrentValue = 0m,
            TotalReturn = 0m
        };
    }

    public IEnumerable<dynamic> GetPortfolioByType(Guid userId)
    {
        const string sql = @"
            SELECT 
                JSON_VALUE(Type, '$.Case') as InvestmentType,
                COUNT(*) as Count,
                SUM(InitialAmount) as TotalInvested,
                SUM(CurrentPrice * CurrentQuantity) as CurrentValue,
                SUM((CurrentPrice * CurrentQuantity) - InitialAmount) as TotalReturn
            FROM [Finance].[Investments]
            WHERE UserId = @UserId
                AND JSON_VALUE(Status, '$.Case') = 'Active'
            GROUP BY JSON_VALUE(Type, '$.Case')
            ORDER BY CurrentValue DESC";

        using var connection = new SqlConnection(_connectionString);
        return connection.Query(sql, new { UserId = userId });
    }

    public decimal GetTotalDividends(Guid userId, DateTime? startDate = null, DateTime? endDate = null)
    {
        var sql = @"
            SELECT COALESCE(SUM(it.TotalAmount), 0)
            FROM [Finance].[InvestmentTransactions] it
            INNER JOIN [Finance].[Investments] i ON it.InvestmentId = i.Id
            WHERE i.UserId = @UserId
                AND it.Type IN ('Dividend', 'InterestPayment')";

        if (startDate.HasValue)
            sql += " AND it.Date >= @StartDate";
        if (endDate.HasValue)
            sql += " AND it.Date <= @EndDate";

        using var connection = new SqlConnection(_connectionString);
        return connection.ExecuteScalar<decimal>(sql, new { UserId = userId, StartDate = startDate, EndDate = endDate });
    }

    public decimal GetTotalCurrentValue(Guid userId)
    {
        const string sql = @"
            SELECT COALESCE(SUM(CurrentPrice * CurrentQuantity), 0)
            FROM [Finance].[Investments]
            WHERE UserId = @UserId
                AND JSON_VALUE(Status, '$.Case') = 'Active'";

        using var connection = new SqlConnection(_connectionString);
        return connection.ExecuteScalar<decimal>(sql, new { UserId = userId });
    }

    public int GetActiveInvestmentCount(Guid userId)
    {
        const string sql = @"
            SELECT COUNT(*)
            FROM [Finance].[Investments]
            WHERE UserId = @UserId
                AND JSON_VALUE(Status, '$.Case') = 'Active'";

        using var connection = new SqlConnection(_connectionString);
        return connection.ExecuteScalar<int>(sql, new { UserId = userId });
    }
}
