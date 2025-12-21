using Microsoft.EntityFrameworkCore;
using HomeOS.Infra.DataModels;

namespace HomeOS.Infra;

public class HomeContext(DbContextOptions<HomeContext> options) : DbContext(options)
{
    public DbSet<TransactionDbModel> Transactions { get; set; } = null!;
    public DbSet<CategoryDbModel> Categories { get; set; } = null!;
    public DbSet<AccountDbModel> Accounts { get; set; } = null!;
    public DbSet<CreditCardDbModel> CreditCards { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Conversão de Guid para string e vice-versa para compatibilidade e controle
        var guidToStringConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Guid, string>(
            id => id.ToString(),
            id => Guid.Parse(id));

        modelBuilder.Entity<TransactionDbModel>()
            .Property(t => t.Id).HasConversion(guidToStringConverter);

        modelBuilder.Entity<CategoryDbModel>()
            .Property(t => t.Id).HasConversion(guidToStringConverter);

        modelBuilder.Entity<AccountDbModel>()
            .Property(t => t.Id).HasConversion(guidToStringConverter);

        modelBuilder.Entity<CreditCardDbModel>()
            .Property(t => t.Id).HasConversion(guidToStringConverter);
    }

}
