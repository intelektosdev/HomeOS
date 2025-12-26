using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.GoalBudgetTypes;
using HomeOS.Infra.Mappers;
using HomeOS.Infra.DataModels;

namespace HomeOS.Infra.Repositories;

public class BudgetRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(Budget budget)
    {
        var dbModel = BudgetMapper.ToDataModel(budget);

        const string sql = @"
            MERGE INTO [Finance].[Budgets] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id AND Target.UserId = @UserId)
            WHEN MATCHED THEN
                UPDATE SET 
                    Name = @Name,
                    AmountLimit = @AmountLimit,
                    PeriodType = @PeriodType,
                    CategoryId = @CategoryId,
                    AlertThreshold = @AlertThreshold
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Name, AmountLimit, PeriodType, CategoryId, AlertThreshold, CreatedAt)
                VALUES (@Id, @UserId, @Name, @AmountLimit, @PeriodType, @CategoryId, @AlertThreshold, @CreatedAt);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public Budget? GetById(Guid id, Guid userId)
    {
        const string sql = @"SELECT * FROM [Finance].[Budgets] WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<BudgetDataModel>(sql, new { Id = id, UserId = userId });

        if (dbModel == null) return null;
        return BudgetMapper.ToDomain(dbModel);
    }

    public IEnumerable<Budget> GetAllByUser(Guid userId)
    {
        const string sql = @"SELECT * FROM [Finance].[Budgets] WHERE UserId = @UserId ORDER BY Name";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<BudgetDataModel>(sql, new { UserId = userId });

        return dbModels.Select(BudgetMapper.ToDomain);
    }

    public void Delete(Guid id, Guid userId)
    {
        const string sql = "DELETE FROM [Finance].[Budgets] WHERE Id = @Id AND UserId = @UserId";
        using var connection = new SqlConnection(_connectionString);
        connection.Execute(sql, new { Id = id, UserId = userId });
    }

    public decimal GetSpentAmount(Guid budgetId, Guid userId, DateTime startDate, DateTime endDate)
    {
        // 1. Recupera o budget para ver o escopo e categoria
        var budget = GetById(budgetId, userId);
        if (budget == null) return 0m;

        string categoryFilter = "";
        Guid? categoryId = null;

        if (budget.Scope.IsCategory)
        {
            categoryFilter = "AND CategoryId = @CategoryId";
            categoryId = ((BudgetScope.Category)budget.Scope).categoryId;
        }

        // Filtra transações do tipo Expense (2) e exclui Canceladas (4)
        string sql = $@"
            SELECT COALESCE(SUM(Amount), 0)
            FROM [Finance].[Transactions]
            WHERE UserId = @UserId
              AND Type = 2 -- Expense
              AND StatusId != 4 -- Cancelled
              AND DueDate BETWEEN @StartDate AND @EndDate
              {categoryFilter}";

        using var connection = new SqlConnection(_connectionString);
        return connection.ExecuteScalar<decimal>(sql, new { UserId = userId, StartDate = startDate, EndDate = endDate, CategoryId = categoryId });
    }
}
