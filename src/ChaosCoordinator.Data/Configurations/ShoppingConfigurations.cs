using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChaosCoordinator.Data.Configurations;

public class StoreConfiguration : IEntityTypeConfiguration<Store>
{
    public void Configure(EntityTypeBuilder<Store> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).IsRequired().HasMaxLength(100);
    }
}

public class ShoppingListItemConfiguration : IEntityTypeConfiguration<ShoppingListItem>
{
    public void Configure(EntityTypeBuilder<ShoppingListItem> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).IsRequired().HasMaxLength(200);
        b.Property(x => x.Department).IsRequired().HasMaxLength(100);
        b.Property(x => x.LastPaidPrice).HasPrecision(10, 2);
        b.HasIndex(x => new { x.StoreId, x.Name });

        b.HasOne(x => x.Store)
            .WithMany(s => s.Items)
            .HasForeignKey(x => x.StoreId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class PriceHistoryEntryConfiguration : IEntityTypeConfiguration<PriceHistoryEntry>
{
    public void Configure(EntityTypeBuilder<PriceHistoryEntry> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Price).HasPrecision(10, 2);

        b.HasOne(x => x.Item)
            .WithMany(i => i.PriceHistory)
            .HasForeignKey(x => x.ItemId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
