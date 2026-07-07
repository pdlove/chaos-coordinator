using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChaosCoordinator.Data.Configurations;

public class ChoreGroupConfiguration : IEntityTypeConfiguration<ChoreGroup>
{
    public void Configure(EntityTypeBuilder<ChoreGroup> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).IsRequired().HasMaxLength(60);
        // Max-4-per-household is app-enforced; this just guards against two groups occupying the same slot.
        b.HasIndex(x => new { x.HouseholdId, x.Order }).IsUnique();
    }
}

public class ChoreConfiguration : IEntityTypeConfiguration<Chore>
{
    public void Configure(EntityTypeBuilder<Chore> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).IsRequired().HasMaxLength(200);
        b.Property(x => x.RecurrenceType).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.RecurrenceDays).HasMaxLength(20);

        b.HasOne(x => x.Group)
            .WithMany(g => g.Chores)
            .HasForeignKey(x => x.GroupId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class ChoreAssignmentConfiguration : IEntityTypeConfiguration<ChoreAssignment>
{
    public void Configure(EntityTypeBuilder<ChoreAssignment> b)
    {
        b.HasKey(x => new { x.ChoreId, x.UserId });

        b.HasOne(x => x.Chore)
            .WithMany(c => c.Assignments)
            .HasForeignKey(x => x.ChoreId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class ChoreCompletionConfiguration : IEntityTypeConfiguration<ChoreCompletion>
{
    public void Configure(EntityTypeBuilder<ChoreCompletion> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.ChoreId, x.Date }).IsUnique();

        b.HasOne(x => x.Chore)
            .WithMany(c => c.Completions)
            .HasForeignKey(x => x.ChoreId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.CompletedBy)
            .WithMany()
            .HasForeignKey(x => x.CompletedById)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
