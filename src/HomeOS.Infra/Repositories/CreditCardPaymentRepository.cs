using System;
using System.Collections.Generic;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.DataModels;
using HomeOS.Infra.Mappers;

namespace HomeOS.Infra.Repositories;

public class CreditCardPaymentRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(CreditCardPayment payment, Guid userId)
    {
        var dbModel = CreditCardPaymentMapper.ToDb(payment, userId);

        const string sql = @"
            INSERT INTO [Finance].[CreditCardPayments] 
                (Id, UserId, CreditCardId, AccountId, Amount, PaymentDate, ReferenceMonth, CreatedAt)
            VALUES 
                (@Id, @UserId, @CreditCardId, @AccountId, @Amount, @PaymentDate, @ReferenceMonth, @CreatedAt)";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public IEnumerable<CreditCardPayment> GetByCardId(Guid creditCardId, Guid userId)
    {
        const string sql = @"
            SELECT Id, CreditCardId, AccountId, Amount, PaymentDate, ReferenceMonth
            FROM [Finance].[CreditCardPayments]
            WHERE CreditCardId = @CreditCardId AND UserId = @UserId
            ORDER BY PaymentDate DESC";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<CreditCardPaymentDbModel>(sql, new { CreditCardId = creditCardId, UserId = userId });

        var result = new List<CreditCardPayment>();
        foreach (var db in dbModels)
        {
            result.Add(CreditCardPaymentMapper.ToDomain(db));
        }
        return result;
    }

    public decimal GetTotalPaidByCard(Guid creditCardId, Guid userId)
    {
        const string sql = @"
            SELECT COALESCE(SUM(Amount), 0)
            FROM [Finance].[CreditCardPayments]
            WHERE CreditCardId = @CreditCardId AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        return connection.ExecuteScalar<decimal>(sql, new { CreditCardId = creditCardId, UserId = userId });
    }
}
