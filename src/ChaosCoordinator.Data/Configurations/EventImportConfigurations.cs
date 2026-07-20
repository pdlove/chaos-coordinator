using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChaosCoordinator.Data.Configurations;

public class EventImportBatchConfiguration : IEntityTypeConfiguration<EventImportBatch>
{
    public void Configure(EntityTypeBuilder<EventImportBatch> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.PastedText).HasMaxLength(20_000);
        b.HasIndex(x => new { x.HouseholdId, x.CreatedAt });

        b.HasOne(x => x.CreatedByUser)
            .WithMany()
            .HasForeignKey(x => x.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class EventImportImageConfiguration : IEntityTypeConfiguration<EventImportImage>
{
    public void Configure(EntityTypeBuilder<EventImportImage> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.ImageUrl).IsRequired().HasMaxLength(500);
        b.HasIndex(x => new { x.BatchId, x.Order });

        b.HasOne(x => x.Batch)
            .WithMany(batch => batch.Images)
            .HasForeignKey(x => x.BatchId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
