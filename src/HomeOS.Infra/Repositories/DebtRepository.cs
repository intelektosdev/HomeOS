using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using HomeOS.Domain.DebtTypes;
using HomeOS.Infra.Mappers;
using HomeOS.Infra.DataModels;

namespace HomeOS.Infra.Repositories;

public class DebtRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new Exception("ConnectionString não encontrada");

    public void Save(Debt debt)
    {
        var dbModel = DebtMapper.ToDb(debt);

        const string sql = @"
            MERGE INTO [Finance].[Debts] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id)
            WHEN MATCHED THEN
                UPDATE SET 
                    Name = @Name,
                    Creditor = @Creditor,
                    CurrentBalance = @CurrentBalance,
                    InstallmentsPaid = @InstallmentsPaid,
                    Status = @Status,
                    LinkedAccountId = @LinkedAccountId,
                    Notes = @Notes
            WHEN NOT MATCHED THEN
                INSERT (Id, UserId, Name, Category, Creditor, OriginalAmount, CurrentBalance, 
                        InterestType, AmortizationType, StartDate, TotalInstallments, InstallmentsPaid,
                        Status, LinkedAccountId, Notes, CreatedAt)
                VALUES (@Id, @UserId, @Name, @Category, @Creditor, @OriginalAmount, @CurrentBalance,
                        @InterestType, @AmortizationType, @StartDate, @TotalInstallments, @InstallmentsPaid,
                        @Status, @LinkedAccountId, @Notes, @CreatedAt);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        connection.Execute(sql, dbModel);
    }

    public Debt? GetById(Guid id, Guid userId)
    {
        const string sql = @"
            SELECT * 
            FROM [Finance].[Debts]
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<DebtDataModel>(sql, new { Id = id, UserId = userId });

        if (dbModel == null) return null;
        return DebtMapper.ToDomain(dbModel);
    }

    public IEnumerable<Debt> GetAllByUser(Guid userId)
    {
        const string sql = @"
            SELECT * 
            FROM [Finance].[Debts]
            WHERE UserId = @UserId
            ORDER BY StartDate DESC";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<DebtDataModel>(sql, new { UserId = userId });

        return dbModels.Select(DebtMapper.ToDomain);
    }

    public IEnumerable<Debt> GetActiveDebts(Guid userId)
    {
        const string sql = @"
            SELECT * 
            FROM [Finance].[Debts]
            WHERE UserId = @UserId
                AND JSON_VALUE(Status, '$.Case') = 'Active'
            ORDER BY CurrentBalance DESC";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<DebtDataModel>(sql, new { UserId = userId });

        return dbModels.Select(DebtMapper.ToDomain);
    }

    public void Delete(Guid id, Guid userId)
    {
        const string sql = @"
            DELETE FROM [Finance].[Debts]
            WHERE Id = @Id AND UserId = @UserId";

        using var connection = new SqlConnection(_connectionString);
        connection.Execute(sql, new { Id = id, UserId = userId });
    }

    // Métodos para DebtInstallments
    public void SaveInstallment(DebtInstallment installment)
    {
        var dbModel = DebtMapper.ToDb(installment);

        const string sql = @"
            MERGE INTO [Finance].[DebtInstallments] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id)
            WHEN MATCHED THEN
                UPDATE SET 
                    PaidDate = @PaidDate,
                    TransactionId = @TransactionId
            WHEN NOT MATCHED THEN
                INSERT (Id, DebtId, InstallmentNumber, DueDate, PaidDate, 
                        TotalAmount, PrincipalAmount, InterestAmount, RemainingBalance, 
                        TransactionId, CreatedAt)
                VALUES (@Id, @DebtId, @InstallmentNumber, @DueDate, @PaidDate,
                        @TotalAmount, @PrincipalAmount, @InterestAmount, @RemainingBalance,
                        @TransactionId, @CreatedAt);";

        using var connection = new SqlConnection(_connectionString);
        connection.Execute(sql, dbModel);
    }

    public void SaveInstallments(IEnumerable<DebtInstallment> installments)
    {
        var dbModels = installments.Select(DebtMapper.ToDb).ToList();

        const string sql = @"
            MERGE INTO [Finance].[DebtInstallments] AS Target
            USING (SELECT @Id AS Id) AS Source
            ON (Target.Id = Source.Id)
            WHEN MATCHED THEN
                UPDATE SET 
                    PaidDate = @PaidDate,
                    TransactionId = @TransactionId
            WHEN NOT MATCHED THEN
                INSERT (Id, DebtId, InstallmentNumber, DueDate, PaidDate, 
                        TotalAmount, PrincipalAmount, InterestAmount, RemainingBalance, 
                        TransactionId, CreatedAt)
                VALUES (@Id, @DebtId, @InstallmentNumber, @DueDate, @PaidDate,
                        @TotalAmount, @PrincipalAmount, @InterestAmount, @RemainingBalance,
                        @TransactionId, @CreatedAt);";

        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        using var transaction = connection.BeginTransaction();

        foreach (var dbModel in dbModels)
        {
            connection.Execute(sql, dbModel, transaction);
        }

        transaction.Commit();
    }

    public IEnumerable<DebtInstallment> GetInstallments(Guid debtId)
    {
        const string sql = @"
            SELECT * 
            FROM [Finance].[DebtInstallments]
            WHERE DebtId = @DebtId
            ORDER BY InstallmentNumber";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<DebtInstallmentDataModel>(sql, new { DebtId = debtId });

        return dbModels.Select(DebtMapper.InstallmentToDomain);
    }

    public IEnumerable<DebtInstallment> GetPendingInstallments(Guid debtId)
    {
        const string sql = @"
            SELECT * 
            FROM [Finance].[DebtInstallments]
            WHERE DebtId = @DebtId
                AND PaidDate IS NULL
            ORDER BY InstallmentNumber";

        using var connection = new SqlConnection(_connectionString);
        var dbModels = connection.Query<DebtInstallmentDataModel>(sql, new { DebtId = debtId });

        return dbModels.Select(DebtMapper.InstallmentToDomain);
    }

    public DebtInstallment? GetInstallmentByNumber(Guid debtId, int installmentNumber)
    {
        const string sql = @"
            SELECT * 
            FROM [Finance].[DebtInstallments]
            WHERE DebtId = @DebtId 
                AND InstallmentNumber = @InstallmentNumber";

        using var connection = new SqlConnection(_connectionString);
        var dbModel = connection.QuerySingleOrDefault<DebtInstallmentDataModel>(
            sql,
            new { DebtId = debtId, InstallmentNumber = installmentNumber }
        );

        if (dbModel == null) return null;
        return DebtMapper.InstallmentToDomain(dbModel);
    }

    // Estatísticas
    public decimal GetTotalDebt(Guid userId)
    {
        const string sql = @"
            SELECT COALESCE(SUM(CurrentBalance), 0)
            FROM [Finance].[Debts]
            WHERE UserId = @UserId
                AND JSON_VALUE(Status, '$.Case') = 'Active'";

        using var connection = new SqlConnection(_connectionString);
        return connection.ExecuteScalar<decimal>(sql, new { UserId = userId });
    }

    public int GetActiveDebtCount(Guid userId)
    {
        const string sql = @"
            SELECT COUNT(*)
            FROM [Finance].[Debts]
            WHERE UserId = @UserId
                AND JSON_VALUE(Status, '$.Case') = 'Active'";

        using var connection = new SqlConnection(_connectionString);
        return connection.ExecuteScalar<int>(sql, new { UserId = userId });
    }
}
