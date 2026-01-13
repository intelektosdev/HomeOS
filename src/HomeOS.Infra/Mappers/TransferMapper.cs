using System;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.DataModels;
using Microsoft.FSharp.Core;

namespace HomeOS.Infra.Mappers;

public static class TransferMapper
{
    public static TransferDbModel ToDb(Transfer domain)
    {
        byte statusId = 1;
        DateTime? completedAt = null;
        string? cancelReason = null;

        if (domain.Status.IsPending)
        {
            statusId = 1;
        }
        else if (domain.Status.IsCompleted)
        {
            statusId = 2;
            var completedStatus = (TransferStatus.Completed)domain.Status;
            completedAt = completedStatus.completedAt;
        }
        else if (domain.Status.IsCancelled)
        {
            statusId = 3;
            var cancelledStatus = (TransferStatus.Cancelled)domain.Status;
            cancelReason = cancelledStatus.reason;
        }

        return new TransferDbModel
        {
            Id = domain.Id,
            UserId = domain.UserId,
            FromAccountId = domain.FromAccountId,
            ToAccountId = domain.ToAccountId,
            Amount = domain.Amount,
            Description = domain.Description,
            TransferDate = domain.TransferDate,
            StatusId = statusId,
            CompletedAt = completedAt,
            CancelReason = cancelReason,
            CreatedAt = domain.CreatedAt
        };
    }

    public static Transfer ToDomain(TransferDbModel db)
    {
        TransferStatus status = db.StatusId switch
        {
            1 => TransferStatus.Pending,
            2 => TransferStatus.NewCompleted(db.CompletedAt!.Value),
            3 => TransferStatus.NewCancelled(db.CancelReason ?? "Unknown"),
            _ => TransferStatus.Pending
        };

        return new Transfer(
            db.Id,
            db.FromAccountId,
            db.ToAccountId,
            db.Amount,
            db.Description,
            db.TransferDate,
            status,
            db.CreatedAt,
            db.UserId
        );
    }
}
