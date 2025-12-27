using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HomeOS.Infra.Repositories;
using HomeOS.Api.Contracts;
using System.Security.Claims;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/analytics")]
// [Authorize] // Disabled for local development
public class AnalyticsController(TransactionRepository transactionRepository) : ControllerBase
{
    private readonly TransactionRepository _transactionRepository = transactionRepository;

    // Fixed userId for local development without authentication
    private static readonly Guid FixedUserId = Guid.Parse("22f4bd46-313d-424a-83b9-0c367ad46c3b");

    private Guid GetCurrentUserId()
    {
        return FixedUserId;
    }


    /// <summary>
    /// Get analytics summary for a given period and grouping dimension
    /// </summary>
    [HttpGet("summary")]
    public IActionResult GetSummary(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] string groupBy = "category")
    {
        // Adjust endDate to include the entire day
        endDate = endDate.Date.AddDays(1).AddTicks(-1);

        var userId = GetCurrentUserId();

        // Get all transactions for period to calculate totals
        var statement = _transactionRepository.GetStatement(startDate, endDate, userId).ToList();

        var pendingCount = statement.Count(t => t.Status == "Pending");

        decimal totalIncome;
        decimal totalExpense;



        // Get grouped data
        var grouped = _transactionRepository.GetAnalyticsSummary(startDate, endDate, groupBy, userId);

        var groups = grouped.Select(g => new GroupedDataResponse(
            Key: (string)g.Key ?? "Sem Classificação",
            Label: (string)g.Label ?? "Sem Classificação",
            Income: (decimal)g.Income,
            Expense: (decimal)g.Expense,
            Count: (int)g.Count
        )).ToList();

        // Calculate totals from groups for accuracy
        totalIncome = groups.Sum(g => g.Income);
        totalExpense = groups.Sum(g => g.Expense);

        var response = new AnalyticsSummaryResponse(
            TotalIncome: totalIncome,
            TotalExpense: totalExpense,
            Balance: totalIncome - totalExpense,
            PendingCount: pendingCount,
            Groups: groups
        );

        return Ok(response);
    }
}
