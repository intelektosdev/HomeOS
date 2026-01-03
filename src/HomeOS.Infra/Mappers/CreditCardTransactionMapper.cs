using System;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.DataModels;
using Microsoft.FSharp.Core;

namespace HomeOS.Infra.Mappers;

public static class CreditCardTransactionMapper
{
    public static CreditCardTransactionDbModel ToDb(CreditCardTransaction domain)
    {
        return new CreditCardTransactionDbModel
        {
            Id = domain.Id,
            UserId = domain.UserId,
            CreditCardId = domain.CreditCardId,
            CategoryId = domain.CategoryId,
            Description = domain.Description,
            Amount = domain.Amount,
            TransactionDate = domain.TransactionDate,
            CreatedAt = domain.CreatedAt,
            
            // Status Mapping
            StatusId = domain.Status.IsPaid ? (byte)3 : domain.Status.IsInvoiced ? (byte)2 : (byte)1,
            
            BillPaymentId = FSharpOption<Guid>.get_IsSome(domain.BillPaymentId) ? domain.BillPaymentId.Value : (Guid?)null,
            
            InstallmentId = FSharpOption<Guid>.get_IsSome(domain.InstallmentId) ? domain.InstallmentId.Value : (Guid?)null,
            InstallmentNumber = FSharpOption<int>.get_IsSome(domain.InstallmentNumber) ? domain.InstallmentNumber.Value : (int?)null,
            TotalInstallments = FSharpOption<int>.get_IsSome(domain.TotalInstallments) ? domain.TotalInstallments.Value : (int?)null,
            
            ProductId = FSharpOption<Guid>.get_IsSome(domain.ProductId) ? domain.ProductId.Value : (Guid?)null
        };
    }

    public static CreditCardTransaction ToDomain(CreditCardTransactionDbModel db)
    {
        var status = db.StatusId switch
        {
            1 => CreditCardTransactionStatus.Open,
            2 => CreditCardTransactionStatus.Invoiced,
            3 => CreditCardTransactionStatus.Paid,
            _ => CreditCardTransactionStatus.Open
        };

        return new CreditCardTransaction(
            db.Id,
            db.CreditCardId,
            db.UserId,
            db.CategoryId,
            db.Description,
            db.Amount,
            db.TransactionDate,
            db.CreatedAt,
            status,
            db.InstallmentId.HasValue ? FSharpOption<Guid>.Some(db.InstallmentId.Value) : FSharpOption<Guid>.None,
            db.InstallmentNumber.HasValue ? FSharpOption<int>.Some(db.InstallmentNumber.Value) : FSharpOption<int>.None,
            db.TotalInstallments.HasValue ? FSharpOption<int>.Some(db.TotalInstallments.Value) : FSharpOption<int>.None,
            db.BillPaymentId.HasValue ? FSharpOption<Guid>.Some(db.BillPaymentId.Value) : FSharpOption<Guid>.None,
            db.ProductId.HasValue ? FSharpOption<Guid>.Some(db.ProductId.Value) : FSharpOption<Guid>.None
        );
    }
}
