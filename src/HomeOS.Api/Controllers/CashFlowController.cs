using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HomeOS.Infra.Repositories;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Api.Contracts;
using System.Security.Claims;
using Microsoft.Data.SqlClient;
using Dapper;

using Microsoft.FSharp.Core;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/cash-flow")]
[Authorize]
public class CashFlowController(
    IConfiguration configuration,
    TransactionRepository transactionRepository,
    RecurringTransactionRepository recurringTransactionRepository) : ControllerBase
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")!;
    private readonly TransactionRepository _transactionRepository = transactionRepository;
    private readonly RecurringTransactionRepository _recurringTransactionRepository = recurringTransactionRepository;

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in token");
        }
        return userId;
    }

    [HttpGet("forecast")]
    public IActionResult GetForecast([FromQuery] int months = 6)
    {
        var userId = GetCurrentUserId();
        var today = DateTime.Today;
        var endDate = today.AddMonths(months);

        // 1. Get Current Total Balance
        decimal currentBalance = GetCurrentBalance(userId);

        // 2. Get Pending/Future Transactions
        // Type: 1 = Income (0 in Tag), 2 = Expense (1 in Tag)
        var pendingTransactions = _transactionRepository.GetStatement(today, endDate, userId)
                                    .Where(t => (string)t.Status == "Pending")
                                    .Select(t => new
                                    {
                                        Date = ((DateTime)t.DueDate).Date,
                                        Amount = (decimal)t.Amount,
                                        Type = (byte)t.Type,
                                        Description = (string)t.Description
                                    })
                                    .ToList();

        // 3. Get Recurring Transactions
        var recurringTransactions = _recurringTransactionRepository.GetAll(userId, false).ToList();

        // 4. Projection
        var dataPoints = new List<CashFlowDataPoint>();
        decimal runningBalance = currentBalance;

        // Start with today
        dataPoints.Add(new CashFlowDataPoint(today, runningBalance, 0, 0, "Saldo Atual"));

        for (var date = today.AddDays(1); date <= endDate; date = date.AddDays(1))
        {
            decimal dailyIncoming = 0;
            decimal dailyOutgoing = 0;

            // One-time pending
            foreach (var t in pendingTransactions.Where(x => x.Date == date.Date))
            {
                if (t.Type == 1) dailyIncoming += t.Amount;
                else dailyOutgoing += t.Amount;
            }

            // Recurring
            foreach (var rt in recurringTransactions)
            {
                // We project from rt.NextOccurrence forward
                var simulatedDate = rt.NextOccurrence.Date;
                while (simulatedDate <= date.Date && simulatedDate <= (FSharpOption<DateTime>.get_IsSome(rt.EndDate) ? rt.EndDate.Value.Date : endDate))
                {
                    if (simulatedDate == date.Date)
                    {
                        decimal amt = rt.AmountType.IsFixed
                            ? ((AmountType.Fixed)rt.AmountType).amount
                            : ((AmountType.Variable)rt.AmountType).averageAmount;

                        if (rt.Type.IsIncome) dailyIncoming += amt;
                        else dailyOutgoing += amt;
                    }

                    simulatedDate = RecurringTransactionModule.calculateNextOccurrence(rt, simulatedDate).Date;
                }
            }

            if (dailyIncoming != 0 || dailyOutgoing != 0)
            {
                runningBalance += dailyIncoming - dailyOutgoing;
                dataPoints.Add(new CashFlowDataPoint(date, runningBalance, dailyIncoming, dailyOutgoing, "Projeção"));
            }
            else if (date.Day == 1 || date == endDate)
            {
                // Maintain points at start of month or end of period for chart continuity
                dataPoints.Add(new CashFlowDataPoint(date, runningBalance, 0, 0, "Projeção"));
            }
        }

        return Ok(new CashFlowForecastResponse(currentBalance, dataPoints));
    }

    private decimal GetCurrentBalance(Guid userId)
    {
        using var connection = new SqlConnection(_connectionString);
        const string sql = @"
            SELECT 
                (SELECT COALESCE(SUM(InitialBalance), 0) FROM [Finance].[Accounts] WHERE UserId = @UserId AND IsActive = 1) +
                (SELECT COALESCE(SUM(Amount), 0) FROM [Finance].[Transactions] WHERE UserId = @UserId AND Type = 1 AND StatusId IN (2, 3)) -
                (SELECT COALESCE(SUM(Amount), 0) FROM [Finance].[Transactions] WHERE UserId = @UserId AND Type = 2 AND StatusId IN (2, 3))";
        return connection.ExecuteScalar<decimal>(sql, new { UserId = userId });
    }
}
