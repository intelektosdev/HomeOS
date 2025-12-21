using System;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using HomeOS.Infra.DataModels;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit; // Necessário para o atributo [Fact]

namespace HomeOS.IntegrationTests;

public class TransactionFlowTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _connectionString;

    // ID fixo que usamos no Mapper C# (TransactionMapper.cs) durante a prototipagem
    // Isso garante que não teremos erro de Foreign Key
    private readonly Guid _dummyId = Guid.Parse("22f4bd46-313d-424a-83b9-0c367ad46c3b");

    public TransactionFlowTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();

        // 1. Configuração: Pega a connection string da API real
        var config = factory.Services.GetRequiredService<IConfiguration>();
        _connectionString = config.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString 'DefaultConnection' não encontrada no appsettings.");

        // 2. Setup do Banco (Seed): Garante que Usuário, Categoria e Conta existam
        // Sem isso, o INSERT da Transação falha por violação de Foreign Key (FK)
        SeedRequiredData();
    }

    private void SeedRequiredData()
    {
        using var conn = new SqlConnection(_connectionString);
        conn.Open();

        // Insere Usuário se não existir
        conn.Execute(@"
            IF NOT EXISTS (SELECT 1 FROM [Finance].[Users] WHERE Id = @Id)
            INSERT INTO [Finance].[Users] (Id, Name, Email, CreatedAt) 
            VALUES (@Id, 'Test User', 'test@integration.com', SYSDATETIME())",
            new { Id = _dummyId });

        // Insere Categoria se não existir (Type 2 = Expense)
        conn.Execute(@"
            IF NOT EXISTS (SELECT 1 FROM [Finance].[Categories] WHERE Id = @Id)
            INSERT INTO [Finance].[Categories] (Id, Name, UserId, Type, Icon) 
            VALUES (@Id, 'Integration Test Category', @Id, 2, 'test-icon')",
            new { Id = _dummyId });

        // Insere Conta se não existir (Type 1 = Wallet)
        conn.Execute(@"
            IF NOT EXISTS (SELECT 1 FROM [Finance].[Accounts] WHERE Id = @Id)
            INSERT INTO [Finance].[Accounts] (Id, Name, UserId, Type, InitialBalance, IsActive) 
            VALUES (@Id, 'Integration Test Account', @Id, 1, 0, 1)",
            new { Id = _dummyId });
    }

    [Fact]
    public async Task CreateExpense_Should_Persist_In_Database_Correctly()
    {
        // 1. ARRANGE
        var requestDto = new
        {
            description = "Teste Integração Dapper",
            amount = 200.50m,
            dueDate = DateTime.UtcNow.AddDays(10)
        };

        // 2. ACT
        var response = await _client.PostAsJsonAsync("/api/transactions", requestDto);

        // 3. ASSERT API
        response.EnsureSuccessStatusCode();

        // Le o corpo da resposta para pegar o ID gerado (Correção importante aqui)
        var responseBody = await response.Content.ReadFromJsonAsync<TransactionResponse>();
        responseBody.Should().NotBeNull();
        responseBody!.Id.Should().NotBeEmpty();

        // 4. ASSERT BANCO DE DADOS
        using var connection = new SqlConnection(_connectionString);
        var dbRecord = await connection.QueryFirstOrDefaultAsync<TransactionDbModel>(
            "SELECT * FROM [Finance].[Transactions] WHERE Id = @Id",
            new { responseBody.Id }
        );

        // Validações
        dbRecord.Should().NotBeNull("o registro deve ter sido salvo no SQL Server");
        dbRecord!.Description.Should().Be(requestDto.description);
        dbRecord.Amount.Should().Be(requestDto.amount);
        dbRecord.StatusId.Should().Be(1); // 1 = Pending

        // 5. TEARDOWN (Limpeza)
        await connection.ExecuteAsync(
            "DELETE FROM [Finance].[Transactions] WHERE Id = @Id",
            new { responseBody.Id }
        );
    }

    // DTO auxiliar para deserializar a resposta
    private record TransactionResponse(Guid Id, string Description, string Status);
}