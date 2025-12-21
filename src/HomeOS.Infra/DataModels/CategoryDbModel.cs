using System;

namespace HomeOS.Infra.DataModels;

public class CategoryDbModel
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public byte Type { get; set; } // 1: Income, 2: Expense (Mapeado do TransactionType do F#)
    public string? Icon { get; set; }
}
