using Microsoft.EntityFrameworkCore;
using HomeOS.Infra.DataModels;

namespace HomeOS.Infra;

public class HomeContext : DbContext
{
    public HomeContext(DbContextOptions<HomeContext> options) : base(options)
    {
    }

    public DbSet<TransactionDbModel> Transactions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Aqui podemos refinar configurações se não quisermos usar Data Annotation
        modelBuilder.Entity<TransactionDbModel>()
            .Property(t => t.Id)
            .HasConversion(
                id => id.ToString(),
                id => Guid.Parse(id)
            );
    }

}
