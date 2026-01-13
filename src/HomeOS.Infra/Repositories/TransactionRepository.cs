using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Mappers;
using HomeOS.Infra.DataModels;
using System.Collections.Generic;

namespace HomeOS.Infra.Repositories;

public class TransactionRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public virtual void Save(Transaction transaction, Guid userId)
    {
        var dbModel = TransactionMapper.ToDb(transaction);
        dbModel.UserId = userId;

        const string sql = @"
            MERGE INTO [Finance].[Transactions] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id AND Target.UserId = @UserId)
            WHEN MATCHED THEN
                UPDATE SET 
                    Description = @Description,
                    Amount = @Amount,
                    DueDate = @DueDate,
                    StatusId = @StatusId,
                    PaymentDate = @PaymentDate,
                    CancellationReason = @CancellationReason,
                    CategoryId = @CategoryId,
                    AccountId = @AccountId,
                    CreditCardId = @CreditCardId,
                    BillPaymentId = @BillPaymentId,
                    InstallmentId = @InstallmentId,
                    InstallmentNumber = @InstallmentNumber,
                    TotalInstallments = @TotalInstallments
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Description, Amount, Type, CategoryId, AccountId, CreditCardId, BillPaymentId, InstallmentId, InstallmentNumber, TotalInstallments, DueDate, StatusId, CreatedAt, PaymentDate, CancellationReason)
                VALUES (@Id, @UserId, @Description, @Amount, @Type, @CategoryId, @AccountId, @CreditCardId, @BillPaymentId, @InstallmentId, @InstallmentNumber, @TotalInstallments, @DueDate, @StatusId, @CreatedAt, @PaymentDate, @CancellationReason);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public Transaction? GetById(Guid id, Guid userId)
    {
        const string sql = @"
            SELECT 
                Id, UserId, Description, Amount, Type, DueDate, CreatedAt,
                StatusId, PaymentDate, CancellationReason,
                CategoryId, AccountId, CreditCardId, BillPaymentId,
                InstallmentId, InstallmentNumber, TotalInstallments
            FROM [Finance].[Transactions]
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<TransactionDbModel>(sql, new { Id = id, UserId = userId });

        if (dbModel == null) return null;
        return TransactionMapper.ToDomain(dbModel);
    }

    public IEnumerable<dynamic> GetStatement(DateTime startDate, DateTime endDate, Guid userId, Guid? categoryId = null, Guid? accountId = null)
    {
        var sql = @"
        SELECT 
            Id, Description, Amount, Type, DueDate, CategoryId, AccountId, CreditCardId, BillPaymentId,
            InstallmentId, InstallmentNumber, TotalInstallments,
            CASE 
                WHEN StatusId = 1 THEN 'Pending'
                WHEN StatusId = 2 THEN 'Paid'
                WHEN StatusId = 3 THEN 'Conciliated'
                WHEN StatusId = 4 THEN 'Cancelled'
            END as Status
        FROM [Finance].[Transactions]
        WHERE DueDate BETWEEN @StartDate AND @EndDate AND UserId = @UserId";

        if (categoryId.HasValue)
        {
            sql += " AND CategoryId = @CategoryId";
        }

        if (accountId.HasValue)
        {
            // Filter primarily by AccountId, but also check transactions Paid via CreditCard that are linked to this account via BillPayment? 
            // For now, let's keep it simple: Filter where AccountId matches (Debit) OR where CreditCard payment is made from this account (CreditCardPayment)
            // Actually, for a simple transaction list filter, we usually mean "Transactions that affected this account".
            // Direct Account Transactions: AccountId = @AccountId
            // Credit Card Transactions: CreditCardId is not NULL (This filter might be tricky if mixed. Let's assume the user wants to see 'Debit' transactions from this account).

            // Re-reading requirements: "Visualizar dados de diferentes periodos" + "Filtros".
            // If I select "Nubank Account", I expect to see expenses paid with "Nubank Account".

            sql += " AND AccountId = @AccountId";
        }

        sql += " ORDER BY DueDate ASC";

        using var connection = new SqlConnection(_connectionString);
        return connection.Query(sql, new { StartDate = startDate, EndDate = endDate, UserId = userId, CategoryId = categoryId, AccountId = accountId });
    }

    // GetPendingByCard removed - migrated to CreditCardTransactionRepository

    // GetUsedLimitByCard removed - migrated to CreditCardTransactionRepository (logic needs to be in Controller or new Repo method)

    /// <summary>
    /// Link transactions to a bill payment and mark them as Conciliated
    /// </summary>
    public void LinkToBillPayment(IEnumerable<Guid> transactionIds, Guid billPaymentId, Guid userId)
    {
        const string sql = @"
        UPDATE [Finance].[Transactions]
        SET BillPaymentId = @BillPaymentId,
            StatusId = 3  -- Conciliated
        WHERE Id IN @TransactionIds 
            AND UserId = @UserId
            AND CreditCardId IS NOT NULL";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, new { TransactionIds = transactionIds, BillPaymentId = billPaymentId, UserId = userId });
    }

    /// <summary>
    /// Get aggregated analytics summary grouped by the specified dimension
    /// </summary>
    public IEnumerable<dynamic> GetAnalyticsSummary(DateTime startDate, DateTime endDate, string groupBy, Guid userId)
    {
        // Build dynamic GROUP BY based on groupBy parameter
        // For drill-down to work, Key must be the ID (for account/category) or status name (for status)
        var keyColumn = groupBy.ToLower() switch
        {
            "category" => "c.Id",
            "account" => "COALESCE(CAST(a.Id AS NVARCHAR(36)), CAST(cc.Id AS NVARCHAR(36)))",
            "status" => @"CASE 
                WHEN t.StatusId = 1 THEN 'Pending'
                WHEN t.StatusId = 2 THEN 'Paid'
                WHEN t.StatusId = 3 THEN 'Conciliated'
                WHEN t.StatusId = 4 THEN 'Cancelled'
            END",
            _ => "c.Id" // default to category
        };

        var labelColumn = groupBy.ToLower() switch
        {
            "category" => "c.Name",
            "account" => "COALESCE(a.Name, cc.Name, 'Sem Origem')",
            "status" => @"CASE 
                WHEN t.StatusId = 1 THEN 'Pendente'
                WHEN t.StatusId = 2 THEN 'Pago'
                WHEN t.StatusId = 3 THEN 'Conciliado'
                WHEN t.StatusId = 4 THEN 'Cancelado'
            END",
            _ => "c.Name"
        };

        var sql = $@"
        SELECT 
            {keyColumn} as [Key],
            {labelColumn} as Label,
            SUM(CASE WHEN t.Type = 1 THEN t.Amount ELSE 0 END) as Income,
            SUM(CASE WHEN t.Type = 2 THEN t.Amount ELSE 0 END) as Expense,
            COUNT(*) as [Count]
        FROM [Finance].[Transactions] t
        LEFT JOIN [Finance].[Categories] c ON t.CategoryId = c.Id
        LEFT JOIN [Finance].[Accounts] a ON t.AccountId = a.Id
        LEFT JOIN [Finance].[CreditCards] cc ON t.CreditCardId = cc.Id
        WHERE t.DueDate BETWEEN @StartDate AND @EndDate 
            AND t.UserId = @UserId
            AND t.StatusId != 4  -- Exclude Cancelled
        GROUP BY {keyColumn}, {labelColumn}
        ORDER BY Expense DESC, Income DESC";

        using var connection = new SqlConnection(_connectionString);
        return connection.Query(sql, new { StartDate = startDate, EndDate = endDate, UserId = userId });
    }

    // Check if a transaction already exists for a specific recurring transaction and date (idempotency)
    public virtual Transaction? GetByRecurringAndDate(Guid recurringId, DateTime dueDate, Guid userId)
    {
        const string sql = @"
            SELECT t.*
            FROM [Finance].[Transactions] t
            INNER JOIN [Finance].[GeneratedTransactions] gt ON t.Id = gt.TransactionId
            WHERE gt.RecurringTransactionId = @RecurringId 
              AND t.UserId = @UserId
              AND CAST(t.DueDate AS DATE) = CAST(@DueDate AS DATE)";

        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QueryFirstOrDefault<TransactionDbModel>(sql, new { RecurringId = recurringId, UserId = userId, DueDate = dueDate });

        return dbModel == null ? null : TransactionMapper.ToDomain(dbModel);
    }

    // LinkToBillPayment removed - This responsibility is now handled by CreditCardTransactionRepository / linking
    
    // Drill-down methods for dashboard analytics
    public IEnumerable<Transaction> GetByAccount(Guid userId, Guid accountId, DateTime start, DateTime end)
    {
        const string sql = @"
            SELECT *
            FROM [Finance].[Transactions]
            WHERE UserId = @UserId
              AND AccountId = @AccountId
              AND DueDate >= @Start
              AND DueDate <= @End
            ORDER BY DueDate DESC";
        
        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<TransactionDbModel>(sql, new { 
            UserId = userId, 
            AccountId = accountId, 
            Start = start, 
            End = end 
        });
        
        return dbModels.Select(TransactionMapper.ToDomain);
    }

    public IEnumerable<Transaction> GetByCategory(Guid userId, Guid categoryId, DateTime start, DateTime end)
    {
        const string sql = @"
            SELECT *
            FROM [Finance].[Transactions]
            WHERE UserId = @UserId
              AND CategoryId = @CategoryId
              AND DueDate >= @Start
              AND DueDate <= @End
            ORDER BY DueDate DESC";
        
        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<TransactionDbModel>(sql, new { 
            UserId = userId, 
            CategoryId = categoryId, 
            Start = start, 
            End = end 
        });
        
        return dbModels.Select(TransactionMapper.ToDomain);
    }

    public IEnumerable<Transaction> GetByStatus(Guid userId, string status, DateTime start, DateTime end)
    {
        byte statusId = status.ToLower() switch
        {
            "pending" or "pendente" => 1,
            "paid" or "pago" => 2,
            "conciliated" or "conciliado" => 3,
            "cancelled" or "cancelado" => 4,
            _ => 1
        };

        const string sql = @"
            SELECT *
            FROM [Finance].[Transactions]
            WHERE UserId = @UserId
              AND StatusId = @StatusId
              AND DueDate >= @Start
              AND DueDate <= @End
            ORDER BY DueDate DESC";
        
        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<TransactionDbModel>(sql, new { 
            UserId = userId, 
            StatusId = statusId, 
            Start = start, 
            End = end 
        });
        
        return dbModels.Select(TransactionMapper.ToDomain);
    }
    
    public void Delete(Guid id, Guid userId)
    {
        const string sql = "DELETE FROM [Finance].[Transactions] WHERE Id = @Id AND UserId = @UserId";
        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, new { Id = id, UserId = userId });
    }
}

