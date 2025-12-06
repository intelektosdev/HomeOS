using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.FinancialTypes; // Seu Domínio F#
using HomeOS.Infra.Mappers;    // Seu Mapper C#
using HomeOS.Infra.DataModels;

namespace HomeOS.Infra.Repositories;

public class TransactionRepository
{
    private readonly string _connectionString;

    public TransactionRepository(IConfiguration configuration)
    {
        // Pega a string de conexão do appsettings.json
        _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");
    }

    // Método para SALVAR (INSERT/UPDATE)
    public void Save(Transaction transaction)
    {
        // 1. Converte F# -> POCO
        var dbModel = TransactionMapper.ToDb(transaction);

        // 2. Define o SQL na mão (Controle total!)
        // Note que estou usando MERGE (Upsert) ou poderia fazer um IF EXISTS
        const string sql = @"
            MERGE INTO [Finance].[Transactions] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id)
            WHEN MATCHED THEN
                UPDATE SET 
                    Description = @Description,
                    Amount = @Amount,
                    DueDate = @DueDate,
                    StatusId = @StatusId,
                    PaymentDate = @PaymentDate,
                    CancellationReason = @CancellationReason
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Description, Amount, Type, CategoryId, AccountId, DueDate, StatusId, CreatedAt)
                VALUES (@Id, @UserId, @Description, @Amount, @Type, @CategoryId, @AccountId, @DueDate, @StatusId, @CreatedAt);";

        // 3. Executa
        using var connection = new SqlConnection(_connectionString);
        connection.Open();

        // O Dapper faz o bind automático das propriedades do dbModel com os parâmetros @
        connection.Execute(sql, dbModel);
    }

    // Método para BUSCAR POR ID
    public Transaction? GetById(Guid id)
    {
        const string sql = @"
            SELECT 
                Id, Description, Amount, Type, DueDate, CreatedAt,
                StatusId, PaymentDate, CancellationReason
            FROM [Finance].[Transactions]
            WHERE Id = @Id";

        using var connection = new SqlConnection(_connectionString);

        // Dapper preenche o POCO
        var dbModel = connection.QuerySingleOrDefault<TransactionDbModel>(sql, new { Id = id });

        if (dbModel == null) return null;

        // Converte POCO -> F# Domain
        return TransactionMapper.ToDomain(dbModel);
    }
}