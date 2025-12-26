using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.GoalBudgetTypes;
using HomeOS.Infra.Mappers;
using HomeOS.Infra.DataModels;

namespace HomeOS.Infra.Repositories;

public class GoalRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(Goal goal)
    {
        var dbModel = GoalMapper.ToDataModel(goal);

        const string sql = @"
            MERGE INTO [Finance].[Goals] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id AND Target.UserId = @UserId)
            WHEN MATCHED THEN
                UPDATE SET 
                    Name = @Name,
                    TargetAmount = @TargetAmount,
                    CurrentAmount = @CurrentAmount,
                    Deadline = @Deadline,
                    LinkedInvestmentId = @LinkedInvestmentId,
                    Status = @Status
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Name, TargetAmount, CurrentAmount, Deadline, LinkedInvestmentId, Status, CreatedAt)
                VALUES (@Id, @UserId, @Name, @TargetAmount, @CurrentAmount, @Deadline, @LinkedInvestmentId, @Status, @CreatedAt);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public Goal? GetById(Guid id, Guid userId)
    {
        const string sql = @"SELECT * FROM [Finance].[Goals] WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<GoalDataModel>(sql, new { Id = id, UserId = userId });

        if (dbModel == null) return null;
        return GoalMapper.ToDomain(dbModel);
    }

    public IEnumerable<Goal> GetAllByUser(Guid userId)
    {
        const string sql = @"SELECT * FROM [Finance].[Goals] WHERE UserId = @UserId ORDER BY CreatedAt DESC";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<GoalDataModel>(sql, new { UserId = userId });

        return dbModels.Select(GoalMapper.ToDomain);
    }

    public void Delete(Guid id, Guid userId)
    {
        const string sql = "DELETE FROM [Finance].[Goals] WHERE Id = @Id AND UserId = @UserId";
        using var connection = new SqlConnection(_connectionString);
        connection.Execute(sql, new { Id = id, UserId = userId });
    }
}
