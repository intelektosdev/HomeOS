using System;
using System.Collections.Generic;
using System.Linq;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Repositories;
using Microsoft.Extensions.Logging;

namespace HomeOS.Infra.Services;

public class RecurringTransactionService(
    RecurringTransactionRepository recurringRepo,
    TransactionRepository transactionRepo,
    ILogger<RecurringTransactionService> logger)
{
    private readonly RecurringTransactionRepository _recurringRepo = recurringRepo;
    private readonly TransactionRepository _transactionRepo = transactionRepo;
    private readonly ILogger<RecurringTransactionService> _logger = logger;

    /// <summary>
    /// Generate pending recurring transactions for a user up to a target date
    /// </summary>
    public int GenerateTransactions(Guid userId, DateTime upToDate)
    {
        var dueRecurrences = _recurringRepo.GetDueForGeneration(userId, upToDate).ToList();
        var generatedCount = 0;

        foreach (var recurring in dueRecurrences)
        {
            try
            {
                // Generate all occurrences up to target date
                while (recurring.NextOccurrence <= upToDate &&
                       (!Microsoft.FSharp.Core.FSharpOption<DateTime>.get_IsSome(recurring.EndDate) || recurring.NextOccurrence <= recurring.EndDate.Value))
                {
                    // Idempotency: Check if transaction already exists for this date
                    var existingTransaction = _transactionRepo.GetByRecurringAndDate(recurring.Id, recurring.NextOccurrence, userId);
                    if (existingTransaction != null)
                    {
                        _logger.LogDebug("Transaction already exists for recurring {RecurringId} on {Date}, skipping", recurring.Id, recurring.NextOccurrence);
                        
                        // Update next occurrence and continue
                        var nextDate = RecurringTransactionModule.calculateNextOccurrence(recurring, recurring.NextOccurrence);
                        _recurringRepo.UpdateNextOccurrence(recurring.Id, nextDate, userId);
                        
                        // Refresh the recurring object for next iteration
                        var refreshed = _recurringRepo.GetById(recurring.Id, userId);
                        if (refreshed == null) break;
                        
                        continue; // Skip to next iteration
                    }

                    var transaction = CreateTransactionFromRecurring(recurring, userId);
                    _transactionRepo.Save(transaction, userId);
                    _recurringRepo.LinkGeneratedTransaction(transaction.Id, recurring.Id);

                    // Update next occurrence
                    var nextOccurrenceDate = RecurringTransactionModule.calculateNextOccurrence(recurring, recurring.NextOccurrence);
                    _recurringRepo.UpdateNextOccurrence(recurring.Id, nextOccurrenceDate, userId);

                    generatedCount++;

                    // Update for next iteration
                    var updated = _recurringRepo.GetById(recurring.Id, userId);
                    if (updated == null) break;

                    // Safety: avoid infinite loops
                    if (generatedCount > 1000)
                    {
                        _logger.LogWarning("Generated too many transactions for recurring {RecurringId}, stopping", recurring.Id);
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate transaction for recurring {RecurringId}", recurring.Id);
            }
        }

        return generatedCount;
    }

    /// <summary>
    /// Preview next N occurrences without saving
    /// </summary>
    public List<DateTime> PreviewOccurrences(RecurringTransaction recurring, int count = 12)
    {
        var occurrences = new List<DateTime>();
        var currentDate = recurring.NextOccurrence;

        for (int i = 0; i < count; i++)
        {
            if (Microsoft.FSharp.Core.FSharpOption<DateTime>.get_IsSome(recurring.EndDate) && currentDate > recurring.EndDate.Value)
                break;

            occurrences.Add(currentDate);
            currentDate = RecurringTransactionModule.calculateNextOccurrence(recurring, currentDate);
        }

        return occurrences;
    }

    private Transaction CreateTransactionFromRecurring(RecurringTransaction recurring, Guid userId)
    {
        var amount = recurring.AmountType.IsFixed
            ? ((AmountType.Fixed)recurring.AmountType).amount
            : ((AmountType.Variable)recurring.AmountType).averageAmount;

        var description = $"{recurring.Description} (Automático)";

        // Create transaction using domain module - FIX: Use correct factory method based on type
        var result = recurring.Type.IsIncome
            ? TransactionModule.createIncome(description, amount, recurring.NextOccurrence, recurring.CategoryId, recurring.Source)
            : TransactionModule.createExpense(description, amount, recurring.NextOccurrence, recurring.CategoryId, recurring.Source);

        if (result.IsError)
        {
            throw new InvalidOperationException($"Failed to create transaction from recurring: {result.ErrorValue}");
        }

        return result.ResultValue;
    }

    /// <summary>
    /// Calculate average amount from recent transactions (for updating variable recurrences)
    /// </summary>
    public decimal CalculateAverageAmount(Guid recurringId, Guid userId, int months = 3)
    {
        // This would require querying generated transactions and calculating average
        // For MVP, we'll return a placeholder
        return 0m;
    }

    /// <summary>
    /// Get statistics about recurring transaction generation for monitoring
    /// </summary>
    public GenerationStats GetGenerationStats(Guid userId)
    {
        var allRecurrences = _recurringRepo.GetAll(userId, includeInactive: true).ToList();
        var activeRecurrences = allRecurrences.Where(r => r.IsActive).ToList();
        
        var nextDueDate = activeRecurrences
            .Where(r => r.IsActive)
            .Select(r => r.NextOccurrence)
            .OrderBy(d => d)
            .FirstOrDefault();

        var lastGenerated = activeRecurrences
            .Where(r => Microsoft.FSharp.Core.FSharpOption<DateTime>.get_IsSome(r.LastGeneratedAt))
            .Select(r => r.LastGeneratedAt.Value)
            .OrderByDescending(d => d)
            .FirstOrDefault();

        var pendingCount = activeRecurrences.Count(r => r.NextOccurrence <= DateTime.Today.AddDays(30));

        return new GenerationStats
        {
            ActiveCount = activeRecurrences.Count,
            TotalCount = allRecurrences.Count,
            NextDueDate = nextDueDate,
            LastRunAt = lastGenerated,
            PendingCount = pendingCount
        };
    }
}

public record GenerationStats
{
    public int ActiveCount { get; init; }
    public int TotalCount { get; init; }
    public DateTime? NextDueDate { get; init; }
    public DateTime? LastRunAt { get; init; }
    public int PendingCount { get; init; }
}
