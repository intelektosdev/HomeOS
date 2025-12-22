using System;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.UserTypes;
using HomeOS.Infra.Mappers;
using HomeOS.Infra.DataModels;

namespace HomeOS.Infra.Repositories;

public class UserRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(User user)
    {
        var dbModel = UserMapper.ToDb(user);

        const string sql = @"
            MERGE INTO [Finance].[Users] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id)
            WHEN MATCHED THEN
                UPDATE SET 
                    Email = @Email,
                    PasswordHash = @PasswordHash,
                    Name = @Name,
                    CreatedAt = @CreatedAt
            WHEN NOT MATCHED THEN
                INSERT (Id, Email, PasswordHash, Name, CreatedAt)
                VALUES (@Id, @Email, @PasswordHash, @Name, @CreatedAt);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public User? GetByEmail(string email)
    {
        const string sql = @"
            SELECT Id, Email, PasswordHash, Name, CreatedAt
            FROM [Finance].[Users]
            WHERE Email = @Email";

        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<UserDbModel>(sql, new { Email = email.ToLowerInvariant() });

        return dbModel == null ? null : UserMapper.ToDomain(dbModel);
    }

    public User? GetById(Guid id)
    {
        const string sql = @"
            SELECT Id, Email, PasswordHash, Name, CreatedAt
            FROM [Finance].[Users]
            WHERE Id = @Id";

        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<UserDbModel>(sql, new { Id = id });

        return dbModel == null ? null : UserMapper.ToDomain(dbModel);
    }

    public bool EmailExists(string email)
    {
        const string sql = @"
            SELECT COUNT(1)
            FROM [Finance].[Users]
            WHERE Email = @Email";

        using var connection = new SqlConnection(_connectionString);
        var count = connection.ExecuteScalar<int>(sql, new { Email = email.ToLowerInvariant() });

        return count > 0;
    }
}
