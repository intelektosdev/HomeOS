using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Mappers;
using HomeOS.Infra.DataModels;
using System.Collections.Generic;

namespace HomeOS.Infra.Repositories;

public class CreditCardTransactionRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(CreditCardTransaction transaction)
    {
        var dbModel = CreditCardTransactionMapper.ToDb(transaction);

        const string sql = @"
            MERGE INTO [Finance].[CreditCardTransactions] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id)
            WHEN MATCHED THEN
                UPDATE SET 
                    Description = @Description,
                    Amount = @Amount,
                    TransactionDate = @TransactionDate,
                    PostingDate = @PostingDate,
                    CategoryId = @CategoryId,
                    InstallmentId = @InstallmentId,
                    InstallmentNumber = @InstallmentNumber,
                    TotalInstallments = @TotalInstallments,
                    StatusId = @StatusId,
                    BillPaymentId = @BillPaymentId
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, CreditCardId, CategoryId, Description, Amount, TransactionDate, PostingDate, CreatedAt, InstallmentId, InstallmentNumber, TotalInstallments, StatusId, BillPaymentId)
                VALUES (@Id, @UserId, @CreditCardId, @CategoryId, @Description, @Amount, @TransactionDate, @PostingDate, @CreatedAt, @InstallmentId, @InstallmentNumber, @TotalInstallments, @StatusId, @BillPaymentId);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public CreditCardTransaction? GetById(Guid id, Guid userId)
    {
        const string sql = @"SELECT * FROM [Finance].[CreditCardTransactions] WHERE Id = @Id AND UserId = @UserId";
        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<CreditCardTransactionDbModel>(sql, new { Id = id, UserId = userId });

        return dbModel == null ? null : CreditCardTransactionMapper.ToDomain(dbModel);
    }

    /// <summary>
    /// Gets open transactions for a card (Status = 1)
    /// </summary>
    public IEnumerable<CreditCardTransaction> GetOpenTransactions(Guid creditCardId, Guid userId)
    {
        const string sql = @"
            SELECT * 
            FROM [Finance].[CreditCardTransactions] 
            WHERE CreditCardId = @CreditCardId 
              AND UserId = @UserId 
              AND StatusId = 1
            ORDER BY TransactionDate DESC";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<CreditCardTransactionDbModel>(sql, new { CreditCardId = creditCardId, UserId = userId });
        
        return dbModels.Select(CreditCardTransactionMapper.ToDomain);
    }
    /// <summary>
    /// Link transactions to a bill payment and mark them as Paid (Status = 3) or Invoiced (2) depending on flow.
    /// Assuming "Pay Bill" means they are settled.
    /// </summary>
    public void LinkToPayment(IEnumerable<Guid> transactionIds, Guid billPaymentId)
    {
        // For MVP, simple IN clause
        const string sql = @"
            UPDATE [Finance].[CreditCardTransactions]
            SET BillPaymentId = @BillPaymentId,
                StatusId = 3  -- Paid
            WHERE Id IN @Ids";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, new { Ids = transactionIds, BillPaymentId = billPaymentId });
    }
}
