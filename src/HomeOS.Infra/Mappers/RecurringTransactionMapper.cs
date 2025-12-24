using System;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.DataModels;
using Microsoft.FSharp.Core;

namespace HomeOS.Infra.Mappers;

public static class RecurringTransactionMapper
{
    public static RecurringTransactionDbModel ToDb(RecurringTransaction domain, Guid userId)
    {
        var dbModel = new RecurringTransactionDbModel
        {
            Id = domain.Id,
            UserId = userId,
            Description = domain.Description,
            Type = domain.Type.IsIncome ? (byte)1 : (byte)2,
            CategoryId = domain.CategoryId,
            FrequencyId = FrequencyToId(domain.Frequency),
            StartDate = domain.StartDate,
            EndDate = FSharpOption<DateTime>.get_IsSome(domain.EndDate) ? domain.EndDate.Value : null,
            NextOccurrence = domain.NextOccurrence,
            IsActive = domain.IsActive,
            CreatedAt = domain.CreatedAt,
            LastGeneratedAt = FSharpOption<DateTime>.get_IsSome(domain.LastGeneratedAt) ? domain.LastGeneratedAt.Value : null,
            DayOfMonth = FSharpOption<int>.get_IsSome(domain.DayOfMonth) ? domain.DayOfMonth.Value : null
        };

        // Map Source
        if (domain.Source.IsFromAccount)
        {
            var source = (TransactionSource.FromAccount)domain.Source;
            dbModel.AccountId = source.accountId;
            dbModel.CreditCardId = null;
        }
        else if (domain.Source.IsFromCreditCard)
        {
            var source = (TransactionSource.FromCreditCard)domain.Source;
            dbModel.AccountId = null;
            dbModel.CreditCardId = source.creditCardId;
        }

        // Map Amount Type
        if (domain.AmountType.IsFixed)
        {
            var amt = (AmountType.Fixed)domain.AmountType;
            dbModel.AmountTypeId = 1;
            dbModel.FixedAmount = amt.amount;
            dbModel.AverageAmount = null;
        }
        else if (domain.AmountType.IsVariable)
        {
            var amt = (AmountType.Variable)domain.AmountType;
            dbModel.AmountTypeId = 2;
            dbModel.FixedAmount = null;
            dbModel.AverageAmount = amt.averageAmount;
        }

        return dbModel;
    }

    public static RecurringTransaction ToDomain(RecurringTransactionDbModel db)
    {
        var type = db.Type == 1 ? TransactionType.Income : TransactionType.Expense;

        TransactionSource source;
        if (db.AccountId.HasValue)
        {
            source = TransactionSource.NewFromAccount(db.AccountId.Value);
        }
        else if (db.CreditCardId.HasValue)
        {
            source = TransactionSource.NewFromCreditCard(db.CreditCardId.Value);
        }
        else
        {
            source = TransactionSource.NewFromAccount(Guid.Empty);
        }

        AmountType amountType;
        if (db.AmountTypeId == 1 && db.FixedAmount.HasValue)
        {
            amountType = AmountType.NewFixed(db.FixedAmount.Value);
        }
        else if (db.AmountTypeId == 2 && db.AverageAmount.HasValue)
        {
            amountType = AmountType.NewVariable(db.AverageAmount.Value);
        }
        else
        {
            amountType = AmountType.NewFixed(0m);
        }

        var frequency = IdToFrequency(db.FrequencyId);
        var endDate = db.EndDate.HasValue ? FSharpOption<DateTime>.Some(db.EndDate.Value) : FSharpOption<DateTime>.None;
        var lastGenerated = db.LastGeneratedAt.HasValue ? FSharpOption<DateTime>.Some(db.LastGeneratedAt.Value) : FSharpOption<DateTime>.None;
        var dayOfMonth = db.DayOfMonth.HasValue ? FSharpOption<int>.Some(db.DayOfMonth.Value) : FSharpOption<int>.None;

        return new RecurringTransaction(
            db.Id,
            db.Description,
            type,
            db.CategoryId,
            source,
            amountType,
            frequency,
            dayOfMonth,
            db.StartDate,
            endDate,
            db.NextOccurrence,
            db.IsActive,
            db.CreatedAt,
            lastGenerated
        );
    }

    private static byte FrequencyToId(RecurrenceFrequency frequency)
    {
        return frequency.Tag switch
        {
            0 => 1, // Daily
            1 => 2, // Weekly
            2 => 3, // Biweekly
            3 => 4, // Monthly
            4 => 5, // Bimonthly
            5 => 6, // Quarterly
            6 => 7, // Semiannual
            7 => 8, // Annual
            _ => 4  // Default to Monthly
        };
    }

    private static RecurrenceFrequency IdToFrequency(byte id)
    {
        return id switch
        {
            1 => RecurrenceFrequency.Daily,
            2 => RecurrenceFrequency.Weekly,
            3 => RecurrenceFrequency.Biweekly,
            4 => RecurrenceFrequency.Monthly,
            5 => RecurrenceFrequency.Bimonthly,
            6 => RecurrenceFrequency.Quarterly,
            7 => RecurrenceFrequency.Semiannual,
            8 => RecurrenceFrequency.Annual,
            _ => RecurrenceFrequency.Monthly
        };
    }
}
