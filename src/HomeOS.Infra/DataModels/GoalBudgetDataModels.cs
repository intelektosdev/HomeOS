using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HomeOS.Infra.DataModels;

[Table("Budgets", Schema = "Finance")]
public class BudgetDataModel
{
    [Key]
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal AmountLimit { get; set; }
    public int PeriodType { get; set; } // 0: Monthly, 1: Yearly, 2: Custom
    public Guid? CategoryId { get; set; }
    public decimal AlertThreshold { get; set; }
    public DateTime CreatedAt { get; set; }
}

[Table("Goals", Schema = "Finance")]
public class GoalDataModel
{
    [Key]
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public decimal CurrentAmount { get; set; }
    public DateTime? Deadline { get; set; }
    public Guid? LinkedInvestmentId { get; set; }
    public int Status { get; set; } // 0: InProgress, 1: Achieved, 2: Paused, 3: Cancelled
    public DateTime CreatedAt { get; set; }
}
