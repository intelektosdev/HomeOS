using System;

namespace HomeOS.Infra.DataModels;

// Esta classe serve apenas para o Dapper preencher os dados vindos do SQL.
public class TransactionDbModel
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; } // Adicionado pois seu SQL tem FK
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public byte Type { get; set; } // TINYINT no SQL vira byte no C#
    public Guid CategoryId { get; set; }
    public Guid? AccountId { get; set; }
    public Guid? CreditCardId { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime CreatedAt { get; set; }

    // Mapeamento dos Status (Flattening)
    public byte StatusId { get; set; }
    public DateTime? PaymentDate { get; set; }
    public DateTime? ConciliatedDate { get; set; }
    public string? CancellationReason { get; set; }
}