using System;
using HomeOS.Domain.DebtTypes;
using HomeOS.Infra.DataModels;
using Microsoft.FSharp.Core;
using Newtonsoft.Json;

namespace HomeOS.Infra.Mappers;

public static class DebtMapper
{
    // Do Domínio (F#) -> Para o Banco (SQL)
    public static DebtDataModel ToDb(Debt domain)
    {
        return new DebtDataModel
        {
            Id = domain.Id,
            UserId = domain.UserId,
            Name = domain.Name,
            Category = SerializeDebtCategory(domain.Category),
            Creditor = domain.Creditor,

            OriginalAmount = domain.OriginalAmount,
            CurrentBalance = domain.CurrentBalance,
            InterestType = SerializeInterestType(domain.InterestType),
            AmortizationType = domain.AmortizationType.ToString(),

            StartDate = domain.StartDate,
            TotalInstallments = domain.TotalInstallments,
            InstallmentsPaid = domain.InstallmentsPaid,

            Status = SerializeDebtStatus(domain.Status),
            LinkedAccountId = FSharpOption<Guid>.get_IsSome(domain.LinkedAccountId)
                ? domain.LinkedAccountId.Value
                : null,
            Notes = FSharpOption<string>.get_IsSome(domain.Notes)
                ? domain.Notes.Value
                : null,

            CreatedAt = DateTime.UtcNow
        };
    }

    // Do Banco (SQL) -> Para o Domínio (F#)
    public static Debt ToDomain(DebtDataModel db)
    {
        var category = DeserializeDebtCategory(db.Category);
        var interestType = DeserializeInterestType(db.InterestType);
        var amortizationType = db.AmortizationType switch
        {
            "Price" => AmortizationType.Price,
            "SAC" => AmortizationType.SAC,
            "Bullet" => AmortizationType.Bullet,
            "Custom" => AmortizationType.Custom,
            _ => AmortizationType.Price
        };
        var status = DeserializeDebtStatus(db.Status);

        var linkedAccountId = db.LinkedAccountId.HasValue
            ? FSharpOption<Guid>.Some(db.LinkedAccountId.Value)
            : FSharpOption<Guid>.None;

        var notes = !string.IsNullOrEmpty(db.Notes)
            ? FSharpOption<string>.Some(db.Notes)
            : FSharpOption<string>.None;

        return new Debt(
            db.Id,
            db.UserId,
            db.Name,
            category,
            db.Creditor,
            db.OriginalAmount,
            db.CurrentBalance,
            interestType,
            amortizationType,
            db.StartDate,
            db.TotalInstallments,
            db.InstallmentsPaid,
            status,
            linkedAccountId,
            notes
        );
    }

    // Installment Mapping
    public static DebtInstallmentDataModel ToDb(DebtInstallment domain)
    {
        return new DebtInstallmentDataModel
        {
            Id = domain.Id,
            DebtId = domain.DebtId,
            InstallmentNumber = domain.InstallmentNumber,
            DueDate = domain.DueDate,
            PaidDate = FSharpOption<DateTime>.get_IsSome(domain.PaidDate)
                ? domain.PaidDate.Value
                : null,

            TotalAmount = domain.TotalAmount,
            PrincipalAmount = domain.PrincipalAmount,
            InterestAmount = domain.InterestAmount,
            RemainingBalance = domain.RemainingBalance,

            TransactionId = FSharpOption<Guid>.get_IsSome(domain.TransactionId)
                ? domain.TransactionId.Value
                : null,

            CreatedAt = DateTime.UtcNow
        };
    }

    public static DebtInstallment InstallmentToDomain(DebtInstallmentDataModel db)
    {
        var paidDate = db.PaidDate.HasValue
            ? FSharpOption<DateTime>.Some(db.PaidDate.Value)
            : FSharpOption<DateTime>.None;

        var transactionId = db.TransactionId.HasValue
            ? FSharpOption<Guid>.Some(db.TransactionId.Value)
            : FSharpOption<Guid>.None;

        return new DebtInstallment(
            db.Id,
            db.DebtId,
            db.InstallmentNumber,
            db.DueDate,
            paidDate,
            db.TotalAmount,
            db.PrincipalAmount,
            db.InterestAmount,
            db.RemainingBalance,
            transactionId
        );
    }

    // Helper Methods para serialização
    private static string SerializeDebtCategory(DebtCategory category)
    {
        return category.Tag switch
        {
            0 => JsonConvert.SerializeObject(new { Case = "Mortgage" }),
            1 => JsonConvert.SerializeObject(new { Case = "PersonalLoan" }),
            2 => JsonConvert.SerializeObject(new { Case = "CarLoan" }),
            3 => JsonConvert.SerializeObject(new { Case = "StudentLoan" }),
            4 => JsonConvert.SerializeObject(new { Case = "Other", Fields = new[] { ((DebtCategory.Other)category).Item } }),
            _ => JsonConvert.SerializeObject(new { Case = "Other", Fields = new[] { "Unknown" } })
        };
    }

    private static DebtCategory DeserializeDebtCategory(string json)
    {
        var obj = JsonConvert.DeserializeObject<dynamic>(json);
        string caseValue = obj.Case;

        return caseValue switch
        {
            "Mortgage" => DebtCategory.Mortgage,
            "PersonalLoan" => DebtCategory.PersonalLoan,
            "CarLoan" => DebtCategory.CarLoan,
            "StudentLoan" => DebtCategory.StudentLoan,
            "Other" => DebtCategory.NewOther((string)obj.Fields[0]),
            _ => DebtCategory.NewOther("Unknown")
        };
    }

    private static string SerializeInterestType(InterestType interestType)
    {
        if (interestType.IsFixed)
        {
            var fixedRate = ((InterestType.Fixed)interestType).rate;
            return JsonConvert.SerializeObject(new { Case = "Fixed", Rate = fixedRate });
        }
        else
        {
            var indexer = ((InterestType.Variable)interestType).indexer;
            return JsonConvert.SerializeObject(new { Case = "Variable", Indexer = indexer });
        }
    }

    private static InterestType DeserializeInterestType(string json)
    {
        var obj = JsonConvert.DeserializeObject<dynamic>(json);
        string caseValue = obj.Case;

        return caseValue switch
        {
            "Fixed" => InterestType.NewFixed((decimal)obj.Rate),
            "Variable" => InterestType.NewVariable((string)obj.Indexer),
            _ => InterestType.NewFixed(0m)
        };
    }

    private static string SerializeDebtStatus(DebtStatus status)
    {
        return status.Tag switch
        {
            0 => JsonConvert.SerializeObject(new { Case = "Active" }),
            1 => JsonConvert.SerializeObject(new
            {
                Case = "PaidOff",
                PaidOffDate = ((DebtStatus.PaidOff)status).paidOffDate
            }),
            2 => JsonConvert.SerializeObject(new
            {
                Case = "Refinanced",
                NewDebtId = ((DebtStatus.Refinanced)status).newDebtId
            }),
            3 => JsonConvert.SerializeObject(new
            {
                Case = "Defaulted",
                Reason = ((DebtStatus.Defaulted)status).reason
            }),
            _ => JsonConvert.SerializeObject(new { Case = "Active" })
        };
    }

    private static DebtStatus DeserializeDebtStatus(string json)
    {
        var obj = JsonConvert.DeserializeObject<dynamic>(json);
        string caseValue = obj.Case;

        return caseValue switch
        {
            "Active" => DebtStatus.Active,
            "PaidOff" => DebtStatus.NewPaidOff((DateTime)obj.PaidOffDate),
            "Refinanced" => DebtStatus.NewRefinanced(Guid.Parse((string)obj.NewDebtId)),
            "Defaulted" => DebtStatus.NewDefaulted((string)obj.Reason),
            _ => DebtStatus.Active
        };
    }
}
