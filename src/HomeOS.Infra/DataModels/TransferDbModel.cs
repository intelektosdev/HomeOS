using System;

namespace HomeOS.Infra.DataModels;

public class TransferDbModel
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid FromAccountId { get; set; }
    public Guid ToAccountId { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime TransferDate { get; set; }
    public byte StatusId { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? CancelReason { get; set; }
    public DateTime CreatedAt { get; set; }
}
