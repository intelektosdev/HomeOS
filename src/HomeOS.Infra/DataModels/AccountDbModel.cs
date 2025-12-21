using System;

namespace HomeOS.Infra.DataModels;

public class AccountDbModel
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public byte Type { get; set; } // 1: Checking, 2: Wallet, 3: Investment
    public decimal InitialBalance { get; set; }
    public bool IsActive { get; set; }
}
