using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChaosCoordinator.Data.Configurations;

public class HouseholdTaskConfiguration : IEntityTypeConfiguration<HouseholdTask>
{
    public void Configure(EntityTypeBuilder<HouseholdTask> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).IsRequired().HasMaxLength(200);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
    }
}

public class TaskClaimConfiguration : IEntityTypeConfiguration<TaskClaim>
{
    public void Configure(EntityTypeBuilder<TaskClaim> b)
    {
        b.HasKey(x => new { x.TaskId, x.UserId });

        b.HasOne(x => x.Task)
            .WithMany(t => t.Claims)
            .HasForeignKey(x => x.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
