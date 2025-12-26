namespace HomeOS.Infra.DataModels;

public class InvestmentDataModel
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;  // JSON serializado

    // Informações Financeiras
    public decimal InitialAmount { get; set; }
    public decimal CurrentQuantity { get; set; }
    public decimal AveragePrice { get; set; }
    public decimal CurrentPrice { get; set; }

    // Prazos
    public DateTime InvestmentDate { get; set; }
    public DateTime? MaturityDate { get; set; }
    public decimal? AnnualYield { get; set; }

    // Controle
    public string Status { get; set; } = string.Empty;  // JSON serializado
    public Guid? LinkedAccountId { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class InvestmentTransactionDataModel
{
    public Guid Id { get; set; }
    public Guid InvestmentId { get; set; }
    public string Type { get; set; } = string.Empty;  // Buy, Sell, Dividend, InterestPayment
    public DateTime Date { get; set; }

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal Fees { get; set; }

    public Guid? FinancialTransactionId { get; set; }
    public DateTime CreatedAt { get; set; }
}
