using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChaosCoordinator.Data.Configurations;

public class BillTemplateConfiguration : IEntityTypeConfiguration<BillTemplate>
{
    public void Configure(EntityTypeBuilder<BillTemplate> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).IsRequired().HasMaxLength(200);
        b.Property(x => x.Amount).HasPrecision(10, 2);
        b.Property(x => x.AmountMin).HasPrecision(10, 2);
        b.Property(x => x.AmountMax).HasPrecision(10, 2);

        b.HasOne(x => x.ManagedBy)
            .WithMany()
            .HasForeignKey(x => x.ManagedById)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class BillConfiguration : IEntityTypeConfiguration<Bill>
{
    public void Configure(EntityTypeBuilder<Bill> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).IsRequired().HasMaxLength(200);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Amount).HasPrecision(10, 2);
        b.Property(x => x.AmountMin).HasPrecision(10, 2);
        b.Property(x => x.AmountMax).HasPrecision(10, 2);

        // Idempotent generation guard — NULL TemplateId (one-off bills) can repeat freely in Postgres unique indexes.
        b.HasIndex(x => new { x.TemplateId, x.BillingMonth }).IsUnique();

        b.HasOne(x => x.Template)
            .WithMany(t => t.Bills)
            .HasForeignKey(x => x.TemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.ManagedBy)
            .WithMany()
            .HasForeignKey(x => x.ManagedById)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
