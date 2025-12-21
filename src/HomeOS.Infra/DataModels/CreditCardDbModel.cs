using System;

namespace HomeOS.Infra.DataModels;

public class CreditCardDbModel
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int ClosingDay { get; set; }
    public int DueDay { get; set; }
    public decimal Limit { get; set; }
}
