using System;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.DataModels;

namespace HomeOS.Infra.Mappers;

public static class AccountMapper
{
    private static readonly Guid DefaultUserId = Guid.Parse("22f4bd46-313d-424a-83b9-0c367ad46c3b");

    public static AccountDbModel ToDb(Account domain)
    {
        byte typeId = domain.Type switch
        {
            var t when t.IsChecking => 1,
            var t when t.IsWallet => 2,
            var t when t.IsInvestment => 3,
            _ => 1 // Default
        };

        return new AccountDbModel
        {
            Id = domain.Id,
            UserId = DefaultUserId, // TODO: Contexto
            Name = domain.Name,
            Type = typeId,
            InitialBalance = domain.InitialBalance,
            IsActive = domain.IsActive
        };
    }

    public static Account ToDomain(AccountDbModel db)
    {
        AccountType type = db.Type switch
        {
            1 => AccountType.Checking,
            2 => AccountType.Wallet,
            3 => AccountType.Investment,
            _ => AccountType.Checking
        };

        return new Account(
            db.Id,
            db.Name,
            type,
            db.InitialBalance,
            db.IsActive
        );
    }
}
