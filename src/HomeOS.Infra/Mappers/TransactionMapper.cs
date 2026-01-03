using System;
using HomeOS.Domain.FinancialTypes; // O F#
using HomeOS.Infra.DataModels; // O Banco
using Microsoft.FSharp.Core;  // Para lidar com o Option/F# types

namespace HomeOS.Infra.Mappers;

public static class TransactionMapper
{
    // Do Dominio (F#) -> Para o Banco (SQL)
    public static TransactionDbModel ToDb(Transaction domain)
    {
        var dbModel = new TransactionDbModel
        {
            Id = domain.Id,
            UserId = Guid.Parse("22f4bd46-313d-424a-83b9-0c367ad46c3b"), // TODO: Pegar do contexto de usuário real
            CategoryId = domain.CategoryId, // Agora vem do domínio!

            Description = domain.Description,
            Amount = domain.Amount,

            // Convertendo o Enum F# para byte
            Type = domain.Type.IsIncome ? (byte)1 : (byte)2,

            DueDate = domain.DueDate,
            CreatedAt = domain.CreatedAt
        };

        // Mapping Source (F# DU -> Flat DB Columns)
        if (domain.Source.IsFromAccount)
        {
            var source = (TransactionSource.FromAccount)domain.Source;
            dbModel.AccountId = source.accountId;
            dbModel.CreditCardId = null;
        }
        else if (domain.Source.IsFromCreditCard)
        {
            // Should not happen for standard Transactions anymore, but keeping for safety/compilation
            // or we could throw exception if strictly enforced
            var source = (TransactionSource.FromCreditCard)domain.Source;
            dbModel.AccountId = null;
            dbModel.CreditCardId = source.creditCardId;
        }

        // Mapping Status (F# DU -> Flat DB Columns)
        switch (domain.Status.Tag)
        {
            case 0: // Pending
                dbModel.StatusId = 1;
                break;
            case 1: // Paid
                dbModel.StatusId = 2;
                var paid = (TransactionStatus.Paid)domain.Status;
                dbModel.PaymentDate = paid.paidAt;
                break;
            case 2: // Conciliated
                dbModel.StatusId = 3;
                break;
            case 3: // Cancelled
                dbModel.StatusId = 4;
                var cancelled = (TransactionStatus.Cancelled)domain.Status;
                dbModel.CancellationReason = cancelled.reason;
                break;
        }

        // BillPaymentId, InstallmentId, etc. are removed from Transaction domain for new flow
        // but if they still exist in DbModel, we leave them null
        
        // ProductId mapping
        dbModel.ProductId = FSharpOption<Guid>.get_IsSome(domain.ProductId) ? domain.ProductId.Value : (Guid?)null;
        
        return dbModel;
    }

    // Do Banco (SQL) -> Para o Dominio (F#)
    public static Transaction ToDomain(TransactionDbModel db)
    {
        // Recontruindo o Status rico (Pattern matching no Id do status)
        TransactionStatus status = db.StatusId switch
        {
            1 => TransactionStatus.Pending,
            2 => TransactionStatus.NewPaid(db.PaymentDate ?? DateTime.MinValue),
            3 => TransactionStatus.NewConciliated(db.PaymentDate ?? DateTime.MinValue),
            4 => TransactionStatus.NewCancelled(db.CancellationReason ?? string.Empty),
            _ => TransactionStatus.Pending // Fallback
        };

        // Convertendo byte para TransactionType (F# Union)
        var type = db.Type == 1 ? TransactionType.Income : TransactionType.Expense;

        // Reconstruindo o Source
        TransactionSource source;
        if (db.AccountId.HasValue)
        {
            source = TransactionSource.NewFromAccount(db.AccountId.Value);
        }
        else
        {
            // Fallback for old data or errors
            source = TransactionSource.NewFromAccount(Guid.Empty);
        }

        return new Transaction(
            db.Id,
            db.Description,
            type,
            status,
            db.Amount,
            db.DueDate,
            db.CreatedAt,
            db.CategoryId,
            source,
            db.ProductId.HasValue ? FSharpOption<Guid>.Some(db.ProductId.Value) : FSharpOption<Guid>.None
            // Removed fields
        );

    }
}
