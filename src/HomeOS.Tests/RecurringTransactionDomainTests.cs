using FluentAssertions;
using HomeOS.Domain.FinancialTypes;
using static HomeOS.Domain.FinancialTypes.RecurringTransactionModule;
using Microsoft.FSharp.Core;

namespace HomeOS.Tests;

public class RecurringTransactionDomainTests
{
    private RecurringTransaction CreateRecurring(
        RecurrenceFrequency frequency,
        DateTime startDate,
        int? dayOfMonth = null)
    {
        return new RecurringTransaction(
            Guid.NewGuid(),
            "Tes",
            TransactionType.Expense,
            Guid.NewGuid(),
            TransactionSource.NewFromAccount(Guid.NewGuid()),
            AmountType.NewFixed(100m),
            frequency,
            dayOfMonth == null ? FSharpOption<int>.None : FSharpOption<int>.Some(dayOfMonth.Value),
            startDate,
            FSharpOption<DateTime>.None,
            startDate, // NextOccurrence initialized to StartDate
            true,
            DateTime.Now,
            FSharpOption<DateTime>.None
        );
    }

    [Theory]
    [InlineData("2024-01-01", "2024-01-02")] // Daily
    public void CalculateNextOccurrence_Daily_AddsOneDay(string currentStr, string expectedStr)
    {
        var current = DateTime.Parse(currentStr);
        var expected = DateTime.Parse(expectedStr);
        var recurring = CreateRecurring(RecurrenceFrequency.Daily, current);

        var result = calculateNextOccurrence(recurring, current);

        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("2024-01-01", "2024-01-08")] // Weekly
    public void CalculateNextOccurrence_Weekly_AddsSevenDays(string currentStr, string expectedStr)
    {
        var current = DateTime.Parse(currentStr);
        var expected = DateTime.Parse(expectedStr);
        var recurring = CreateRecurring(RecurrenceFrequency.Weekly, current);

        var result = calculateNextOccurrence(recurring, current);

        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("2024-01-01", "2024-02-01")] // Monthly
    [InlineData("2024-01-31", "2024-02-29")] // Monthly (Leap Year)
    [InlineData("2023-01-31", "2023-02-28")] // Monthly (Non-Leap Year)
    public void CalculateNextOccurrence_Monthly_AddsOneMonthHandlingEnd(string currentStr, string expectedStr)
    {
        var current = DateTime.Parse(currentStr);
        var expected = DateTime.Parse(expectedStr);
        // DayOfMonth = current day
        var recurring = CreateRecurring(RecurrenceFrequency.Monthly, current, current.Day);

        var result = calculateNextOccurrence(recurring, current);

        result.Should().Be(expected);
    }

    [Fact]
    public void CalculateNextOccurrence_Monthly_LastDayOption()
    {
        var current = new DateTime(2024, 1, 31);
        // DayOfMonth = None (Last Day)
        var recurring = CreateRecurring(RecurrenceFrequency.Monthly, current, null);

        var result = calculateNextOccurrence(recurring, current);

        // Should be last day of next month (Feb 2024 = 29)
        result.Should().Be(new DateTime(2024, 2, 29));
    }

    [Fact]
    public void CalculateNextOccurrence_Annual_AddsOneYear()
    {
        var current = new DateTime(2024, 2, 29); // Leap day
        var recurring = CreateRecurring(RecurrenceFrequency.Annual, current, 29);

        var result = calculateNextOccurrence(recurring, current);

        // 2025 is not leap year, should fail safe to 28? Or throw?
        // Let's check logic: baseDate.AddYears(1). 
        // .NET AddYears handles leap year: 2024-02-29 + 1 year => 2025-02-28
        result.Should().Be(new DateTime(2025, 2, 28));
    }
}
