namespace HomeOS.Infra.DataModels;

public class DebtDataModel
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;  // JSON serializado
    public string Creditor { get; set; } = string.Empty;

    // Valores Financeiros
    public decimal OriginalAmount { get; set; }
    public decimal CurrentBalance { get; set; }
    public string InterestType { get; set; } = string.Empty;  // JSON serializado
    public string AmortizationType { get; set; } = string.Empty;

    // Prazos
    public DateTime StartDate { get; set; }
    public int TotalInstallments { get; set; }
    public int InstallmentsPaid { get; set; }

    // Controle
    public string Status { get; set; } = string.Empty;  // JSON serializado
    public Guid? LinkedAccountId { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }
}

public class DebtInstallmentDataModel
{
    public Guid Id { get; set; }
    public Guid DebtId { get; set; }
    public int InstallmentNumber { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime? PaidDate { get; set; }

    // Decomposição
    public decimal TotalAmount { get; set; }
    public decimal PrincipalAmount { get; set; }
    public decimal InterestAmount { get; set; }
    public decimal RemainingBalance { get; set; }

    public Guid? TransactionId { get; set; }
    public DateTime CreatedAt { get; set; }
}
