using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.FinancialTypes; // Seu Domínio F#
using HomeOS.Infra.Mappers;    // Seu Mapper C#
using HomeOS.Infra.DataModels;
using System.Collections.Generic;

namespace HomeOS.Infra.Repositories;

public class TransactionRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    // Método para SALVAR (INSERT/UPDATE)
    public void Save(Transaction transaction, Guid userId)
    {
        // 1. Converte F# -> POCO
        var dbModel = TransactionMapper.ToDb(transaction);
        dbModel.UserId = userId; // Associ automatically with user

        // 2. Define o SQL na mão (Controle total!)
        // Note que estou usando MERGE (Upsert) ou poderia fazer um IF EXISTS
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
                    CreditCardId = @CreditCardId
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Description, Amount, Type, CategoryId, AccountId, CreditCardId, DueDate, StatusId, CreatedAt, PaymentDate, ConciliatedDate, CancellationReason)
                VALUES (@Id, @UserId, @Description, @Amount, @Type, @CategoryId, @AccountId, @CreditCardId, @DueDate, @StatusId, @CreatedAt, @PaymentDate, @ConciliatedDate, @CancellationReason);";

        // 3. Executa
        using var connection = new SqlConnection(_connectionString);
        connection.Open();

        // O Dapper faz o bind automático das propriedades do dbModel com os parâmetros @
        connection.Execute(sql, dbModel);
    }

    // Método para BUSCAR POR ID
    public Transaction? GetById(Guid id, Guid userId)
    {
        const string sql = @"
            SELECT 
                Id, UserId, Description, Amount, Type, DueDate, CreatedAt,
                StatusId, PaymentDate, ConciliatedDate, CancellationReason,
                CategoryId, AccountId, CreditCardId
            FROM [Finance].[Transactions]
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);

        // Dapper preenche o POCO
        var dbModel = connection.QuerySingleOrDefault<TransactionDbModel>(sql, new { Id = id, UserId = userId });

        if (dbModel == null) return null;

        // Converte POCO -> F# Domain
        return TransactionMapper.ToDomain(dbModel);

    }

    public IEnumerable<dynamic> GetStatement(DateTime startDate, DateTime endDate, Guid userId)
    {
        const string sql = @"
        SELECT 
            Id, 
            Description, 
            Amount, 
            DueDate,
            CategoryId,
            AccountId,
            CreditCardId,
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

        // Retornamos dynamic ou criamos uma classe específica de leitura (ReadModel)
        return connection.Query(sql, new { StartDate = startDate, EndDate = endDate, UserId = userId });
    }
}