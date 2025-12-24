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

    public void Save(Transaction transaction, Guid userId)
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
                    ConciliatedDate = @ConciliatedDate,
                    CancellationReason = @CancellationReason,
                    CategoryId = @CategoryId,
                    AccountId = @AccountId,
                    CreditCardId = @CreditCardId,
                    BillPaymentId = @BillPaymentId,
                    InstallmentId = @InstallmentId,
                    InstallmentNumber = @InstallmentNumber,
                    TotalInstallments = @TotalInstallments
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Description, Amount, Type, CategoryId, AccountId, CreditCardId, BillPaymentId, InstallmentId, InstallmentNumber, TotalInstallments, DueDate, StatusId, CreatedAt, PaymentDate, ConciliatedDate, CancellationReason)
                VALUES (@Id, @UserId, @Description, @Amount, @Type, @CategoryId, @AccountId, @CreditCardId, @BillPaymentId, @InstallmentId, @InstallmentNumber, @TotalInstallments, @DueDate, @StatusId, @CreatedAt, @PaymentDate, @ConciliatedDate, @CancellationReason);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public Transaction? GetById(Guid id, Guid userId)
    {
        const string sql = @"
            SELECT 
                Id, UserId, Description, Amount, Type, DueDate, CreatedAt,
                StatusId, PaymentDate, ConciliatedDate, CancellationReason,
                CategoryId, AccountId, CreditCardId, BillPaymentId,
                InstallmentId, InstallmentNumber, TotalInstallments
            FROM [Finance].[Transactions]
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<TransactionDbModel>(sql, new { Id = id, UserId = userId });

        if (dbModel == null) return null;
        return TransactionMapper.ToDomain(dbModel);
    }

    public IEnumerable<dynamic> GetStatement(DateTime startDate, DateTime endDate, Guid userId)
    {
        const string sql = @"
        SELECT 
            Id, Description, Amount, DueDate, CategoryId, AccountId, CreditCardId, BillPaymentId,
            CASE 
                WHEN StatusId = 1 THEN 'Pending'
                WHEN StatusId = 2 THEN 'Paid'
                WHEN StatusId = 3 THEN 'Conciliated'
                WHEN StatusId = 4 THEN 'Cancelled'
            END as Status
        FROM [Finance].[Transactions]
        WHERE DueDate BETWEEN @StartDate AND @EndDate AND UserId = @UserId
        ORDER BY DueDate ASC";

        using var connection = new SqlConnection(_connectionString);
        return connection.Query(sql, new { StartDate = startDate, EndDate = endDate, UserId = userId });
    }

    /// <summary>
    /// Get transactions for a credit card that are not yet linked to a bill payment (pending for bill)
    /// </summary>
    public IEnumerable<dynamic> GetPendingByCard(Guid creditCardId, Guid userId)
    {
        const string sql = @"
        SELECT 
            Id, Description, Amount, DueDate, CategoryId, 
            InstallmentNumber, TotalInstallments,
            CASE 
                WHEN StatusId = 1 THEN 'Pending'
                WHEN StatusId = 2 THEN 'Paid'
                WHEN StatusId = 3 THEN 'Conciliated'
                WHEN StatusId = 4 THEN 'Cancelled'
            END as Status
        FROM [Finance].[Transactions]
        WHERE CreditCardId = @CreditCardId 
            AND UserId = @UserId 
            AND BillPaymentId IS NULL
            AND StatusId != 4  -- Not Cancelled
        ORDER BY DueDate ASC";

        using var connection = new SqlConnection(_connectionString);
        return connection.Query(sql, new { CreditCardId = creditCardId, UserId = userId });
    }

    /// <summary>
    /// Calculate the used limit: sum of transactions linked to the card without BillPaymentId (not yet paid in bill)
    /// </summary>
    public decimal GetUsedLimitByCard(Guid creditCardId, Guid userId)
    {
        const string sql = @"
        SELECT COALESCE(SUM(Amount), 0)
        FROM [Finance].[Transactions]
        WHERE CreditCardId = @CreditCardId 
            AND UserId = @UserId 
            AND BillPaymentId IS NULL
            AND StatusId != 4";  // Not Cancelled

        using var connection = new SqlConnection(_connectionString);
        return connection.ExecuteScalar<decimal>(sql, new { CreditCardId = creditCardId, UserId = userId });
    }

    /// <summary>
    /// Link transactions to a bill payment and mark them as Conciliated
    /// </summary>
    public void LinkToBillPayment(IEnumerable<Guid> transactionIds, Guid billPaymentId, Guid userId)
    {
        const string sql = @"
        UPDATE [Finance].[Transactions]
        SET BillPaymentId = @BillPaymentId,
            StatusId = 3,  -- Conciliated
            ConciliatedDate = GETDATE()
        WHERE Id IN @TransactionIds 
            AND UserId = @UserId
            AND CreditCardId IS NOT NULL";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, new { TransactionIds = transactionIds, BillPaymentId = billPaymentId, UserId = userId });
    }
}
