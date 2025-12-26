using System;
using HomeOS.Domain.InvestmentTypes;
using HomeOS.Infra.DataModels;
using Microsoft.FSharp.Core;
using Newtonsoft.Json;

namespace HomeOS.Infra.Mappers;

public static class InvestmentMapper
{
    // Do Domínio (F#) -> Para o Banco (SQL)
    public static InvestmentDataModel ToDb(Investment domain)
    {
        return new InvestmentDataModel
        {
            Id = domain.Id,
            UserId = domain.UserId,
            Name = domain.Name,
            Type = SerializeInvestmentType(domain.Type),

            InitialAmount = domain.InitialAmount,
            CurrentQuantity = domain.CurrentQuantity,
            AveragePrice = domain.AveragePrice,
            CurrentPrice = domain.CurrentPrice,

            InvestmentDate = domain.InvestmentDate,
            MaturityDate = FSharpOption<DateTime>.get_IsSome(domain.MaturityDate)
                ? domain.MaturityDate.Value
                : null,
            AnnualYield = FSharpOption<decimal>.get_IsSome(domain.AnnualYield)
                ? domain.AnnualYield.Value
                : null,

            Status = SerializeInvestmentStatus(domain.Status),
            LinkedAccountId = FSharpOption<Guid>.get_IsSome(domain.LinkedAccountId)
                ? domain.LinkedAccountId.Value
                : null,
            Notes = FSharpOption<string>.get_IsSome(domain.Notes)
                ? domain.Notes.Value
                : null,

            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    // Do Banco (SQL) -> Para o Domínio (F#)
    public static Investment ToDomain(InvestmentDataModel db)
    {
        var invType = DeserializeInvestmentType(db.Type);
        var status = DeserializeInvestmentStatus(db.Status);

        var maturityDate = db.MaturityDate.HasValue
            ? FSharpOption<DateTime>.Some(db.MaturityDate.Value)
            : FSharpOption<DateTime>.None;

        var annualYield = db.AnnualYield.HasValue
            ? FSharpOption<decimal>.Some(db.AnnualYield.Value)
            : FSharpOption<decimal>.None;

        var linkedAccountId = db.LinkedAccountId.HasValue
            ? FSharpOption<Guid>.Some(db.LinkedAccountId.Value)
            : FSharpOption<Guid>.None;

        var notes = !string.IsNullOrEmpty(db.Notes)
            ? FSharpOption<string>.Some(db.Notes)
            : FSharpOption<string>.None;

        return new Investment(
            db.Id,
            db.UserId,
            db.Name,
            invType,
            db.InitialAmount,
            db.CurrentQuantity,
            db.AveragePrice,
            db.CurrentPrice,
            db.InvestmentDate,
            maturityDate,
            annualYield,
            status,
            linkedAccountId,
            notes
        );
    }

    // InvestmentTransaction Mapping
    public static InvestmentTransactionDataModel ToDb(InvestmentTransaction domain)
    {
        return new InvestmentTransactionDataModel
        {
            Id = domain.Id,
            InvestmentId = domain.InvestmentId,
            Type = domain.Type.ToString(),
            Date = domain.Date,

            Quantity = domain.Quantity,
            UnitPrice = domain.UnitPrice,
            TotalAmount = domain.TotalAmount,
            Fees = domain.Fees,

            FinancialTransactionId = FSharpOption<Guid>.get_IsSome(domain.FinancialTransactionId)
                ? domain.FinancialTransactionId.Value
                : null,

            CreatedAt = DateTime.UtcNow
        };
    }

    public static InvestmentTransaction TransactionToDomain(InvestmentTransactionDataModel db)
    {
        var type = db.Type switch
        {
            "Buy" => InvestmentTransactionType.Buy,
            "Sell" => InvestmentTransactionType.Sell,
            "Dividend" => InvestmentTransactionType.Dividend,
            "InterestPayment" => InvestmentTransactionType.InterestPayment,
            _ => InvestmentTransactionType.Buy
        };

        var financialTransactionId = db.FinancialTransactionId.HasValue
            ? FSharpOption<Guid>.Some(db.FinancialTransactionId.Value)
            : FSharpOption<Guid>.None;

        return new InvestmentTransaction(
            db.Id,
            db.InvestmentId,
            type,
            db.Date,
            db.Quantity,
            db.UnitPrice,
            db.TotalAmount,
            db.Fees,
            financialTransactionId
        );
    }

    // Helper Methods para serialização
    private static string SerializeInvestmentType(InvestmentType invType)
    {
        return invType.Tag switch
        {
            0 => JsonConvert.SerializeObject(new
            {
                Case = "Stock",
                Ticker = ((InvestmentType.Stock)invType).ticker
            }),
            1 => JsonConvert.SerializeObject(new
            {
                Case = "FixedIncome",
                SubType = SerializeFixedIncomeType(((InvestmentType.FixedIncome)invType).Item)
            }),
            2 => JsonConvert.SerializeObject(new
            {
                Case = "RealEstate",
                Property = ((InvestmentType.RealEstate)invType).property
            }),
            3 => JsonConvert.SerializeObject(new
            {
                Case = "Cryptocurrency",
                Symbol = ((InvestmentType.Cryptocurrency)invType).symbol
            }),
            4 => JsonConvert.SerializeObject(new
            {
                Case = "Other",
                Description = ((InvestmentType.Other)invType).description
            }),
            _ => JsonConvert.SerializeObject(new { Case = "Other", Description = "Unknown" })
        };
    }

    private static string SerializeFixedIncomeType(FixedIncomeType fiType)
    {
        return fiType.Tag switch
        {
            0 => JsonConvert.SerializeObject(new
            {
                Case = "CDB",
                Bank = ((FixedIncomeType.CDB)fiType).bank
            }),
            1 => JsonConvert.SerializeObject(new { Case = "LCI" }),
            2 => JsonConvert.SerializeObject(new { Case = "LCA" }),
            3 => JsonConvert.SerializeObject(new
            {
                Case = "TesouroDireto",
                Title = ((FixedIncomeType.TesouroDireto)fiType).title
            }),
            4 => JsonConvert.SerializeObject(new
            {
                Case = "Debenture",
                Issuer = ((FixedIncomeType.Debenture)fiType).issuer
            }),
            _ => JsonConvert.SerializeObject(new { Case = "LCI" })
        };
    }

    private static InvestmentType DeserializeInvestmentType(string json)
    {
        var obj = JsonConvert.DeserializeObject<dynamic>(json);
        string caseValue = obj.Case;

        return caseValue switch
        {
            "Stock" => InvestmentType.NewStock((string)obj.Ticker),
            "FixedIncome" => InvestmentType.NewFixedIncome(DeserializeFixedIncomeType(JsonConvert.SerializeObject(obj.SubType))),
            "RealEstate" => InvestmentType.NewRealEstate((string)obj.Property),
            "Cryptocurrency" => InvestmentType.NewCryptocurrency((string)obj.Symbol),
            "Other" => InvestmentType.NewOther((string)obj.Description),
            _ => InvestmentType.NewOther("Unknown")
        };
    }

    private static FixedIncomeType DeserializeFixedIncomeType(string json)
    {
        var obj = JsonConvert.DeserializeObject<dynamic>(json);
        string caseValue = obj.Case;

        return caseValue switch
        {
            "CDB" => FixedIncomeType.NewCDB((string)obj.Bank),
            "LCI" => FixedIncomeType.LCI,
            "LCA" => FixedIncomeType.LCA,
            "TesouroDireto" => FixedIncomeType.NewTesouroDireto((string)obj.Title),
            "Debenture" => FixedIncomeType.NewDebenture((string)obj.Issuer),
            _ => FixedIncomeType.LCI
        };
    }

    private static string SerializeInvestmentStatus(InvestmentStatus status)
    {
        return status.Tag switch
        {
            0 => JsonConvert.SerializeObject(new { Case = "Active" }),
            1 => JsonConvert.SerializeObject(new
            {
                Case = "Redeemed",
                RedemptionDate = ((InvestmentStatus.Redeemed)status).redemptionDate
            }),
            2 => JsonConvert.SerializeObject(new
            {
                Case = "Matured",
                MaturityDate = ((InvestmentStatus.Matured)status).maturityDate
            }),
            _ => JsonConvert.SerializeObject(new { Case = "Active" })
        };
    }

    private static InvestmentStatus DeserializeInvestmentStatus(string json)
    {
        var obj = JsonConvert.DeserializeObject<dynamic>(json);
        string caseValue = obj.Case;

        return caseValue switch
        {
            "Active" => InvestmentStatus.Active,
            "Redeemed" => InvestmentStatus.NewRedeemed((DateTime)obj.RedemptionDate),
            "Matured" => InvestmentStatus.NewMatured((DateTime)obj.MaturityDate),
            _ => InvestmentStatus.Active
        };
    }
}
