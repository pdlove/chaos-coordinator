using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChaosCoordinator.Data.Configurations;

public class BillPhotoBatchConfiguration : IEntityTypeConfiguration<BillPhotoBatch>
{
    public void Configure(EntityTypeBuilder<BillPhotoBatch> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.HouseholdId, x.CreatedAt });
        b.HasIndex(x => x.BillId);

        b.HasOne(x => x.CreatedByUser)
            .WithMany()
            .HasForeignKey(x => x.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.Bill)
            .WithMany(bill => bill.PhotoBatches)
            .HasForeignKey(x => x.BillId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class BillPhotoImageConfiguration : IEntityTypeConfiguration<BillPhotoImage>
{
    public void Configure(EntityTypeBuilder<BillPhotoImage> b)
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
