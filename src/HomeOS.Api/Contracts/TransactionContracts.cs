using System.ComponentModel.DataAnnotations;

namespace HomeOS.Api.Contracts;

// Record: Novidade do C# 9+. Imutável por padrão, perfeito para DTOs.
public record CreateTransactionRequest(
    [Required] string Description,
    [Range(0.01, 1000000)] decimal Amount,
    DateTime DueDate,
    [Required] Guid CategoryId,
    Guid? AccountId,
    Guid? CreditCardId
);

public record TransactionResponse(
    Guid Id,
    string Description,
    decimal Amount,
    string Status,
    DateTime DueDate
);