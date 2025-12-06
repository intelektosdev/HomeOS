using System;
using System.Net.Http.Json;
using System.Runtime.ExceptionServices;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using HomeOS.Infra.DataModels;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;  // Necessáriopara ler config
using Microsoft.Extensions.DependencyInjection; // Necessário para acessar serviços

namespace HomeOS.IntegrationTests;

// IClassFixture garante que a API suba apenas uma vez para todos os testes desta classe
public class TransactionFlowTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _connectionString;

    public TransactionFlowTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();

        // Hack para pegar a connection string usadda pela API "viva"
        var config = factory.Services.GetRequiredService<IConfiguration>();
        _connectionString = config.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

        // Seed Database with required FKs
        using var conn = new SqlConnection(_connectionString);
        var dummyId = Guid.Parse("22f4bd46-313d-424a-83b9-0c367ad46c3b"); // Matches TransactionMapper Hardcoded ID

        // Ensure User
        conn.Execute(@"
            IF NOT EXISTS (SELECT 1 FROM [Finance].[Users] WHERE Id = @Id)
            INSERT INTO [Finance].[Users] (Id, Name, Email, CreatedAt) 
            VALUES (@Id, 'Test User', 'test@test.com', SYSDATETIME())",
            new { Id = dummyId });

        // Ensure Category
        // Assuming Type 2 = Expense
        conn.Execute(@"
            IF NOT EXISTS (SELECT 1 FROM [Finance].[Categories] WHERE Id = @Id)
            INSERT INTO [Finance].[Categories] (Id, Name, UserId, Type, Icon) 
            VALUES (@Id, 'Test Category', @Id, 2, 'dummy-icon')",
            new { Id = dummyId });

        // Ensure Account
        // Assuming Type 1 = Wallet/Checking, IsActive = 1
        conn.Execute(@"
            IF NOT EXISTS (SELECT 1 FROM [Finance].[Accounts] WHERE Id = @Id)
            INSERT INTO [Finance].[Accounts] (Id, Name, UserId, Type, InitialBalance, IsActive) 
            VALUES (@Id, 'Test Account', @Id, 1, 0, 1)",
            new { Id = dummyId });
    }

    [Fact]
    public async Task CreateExpense_Should_Persist_In_Database_Correctly()
    {
        // 1. ARRRANGE (Preparar)
        var payload = new
        {
            description = "Teste Integração Dapper",
            amount = 100.50m,
            dueDate = DateTime.UtcNow.AddDays(5)
        };

        // 2. ACT (Agir - Chamar a API)
        // Using formated string with InvariantCulture to ensure dot separator
        var url = string.Format(System.Globalization.CultureInfo.InvariantCulture,
            "/api/transactions?description={0}&amount={1}&dueDate={2:O}",
            payload.description, payload.amount, payload.dueDate);

        var response = await _client.PostAsJsonAsync(url, new { });

        // 3. ASSERT (Verificar resposta da API)
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new Exception($"API failed with {response.StatusCode}: {error}");
        }

        var responseBody = await response.Content.ReadFromJsonAsync<TransactionResponse>();
        responseBody.Should().NotBeNull();
        responseBody!.Id.Should().NotBeEmpty();

        // 4. ASSERT (Verificar no banco)
        using var connection = new SqlConnection(_connectionString);
        var dbRecord = await connection.QueryFirstOrDefaultAsync<TransactionDbModel>(
            "SELECT * FROM [Finance].[Transactions] WHERE Id = @Id",
            new { Id = responseBody!.Id }
        );

        // Asserções no banco
        dbRecord.Should().NotBeNull("o registro deve existir no banco");
        dbRecord!.Description.Should().Be(payload.description);
        dbRecord.Amount.Should().Be(payload.amount);
        dbRecord.StatusId.Should().Be(1); // 1 = PENDING

        // 5.TEARDOWN (Limpar)
        // como estamos usando o banco real de dev, vamos limpar a sujeira que criamos
        await connection.ExecuteAsync(
            "DELETE FROM [Finance].[Transactions] WHERE Id = @Id",
            new { Id = responseBody!.Id }
        );

    }

    // Classse auxiliar apena para ler o JSON de retono
    private record TransactionResponse(Guid Id, string Description, string Status);
}