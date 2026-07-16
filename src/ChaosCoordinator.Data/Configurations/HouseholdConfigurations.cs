using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChaosCoordinator.Data.Configurations;

public class HouseholdConfiguration : IEntityTypeConfiguration<Household>
{
    public void Configure(EntityTypeBuilder<Household> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).IsRequired().HasMaxLength(200);
        b.Property(x => x.BottomBarTabs).IsRequired().HasMaxLength(200);
    }
}

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).IsRequired().HasMaxLength(100);
        b.Property(x => x.Initials).IsRequired().HasMaxLength(4);
        b.Property(x => x.Color).IsRequired().HasMaxLength(20);
        b.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);

        b.HasOne(x => x.Household)
            .WithMany(h => h.Users)
            .HasForeignKey(x => x.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class DietaryTagConfiguration : IEntityTypeConfiguration<DietaryTag>
{
    public void Configure(EntityTypeBuilder<DietaryTag> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Tag).IsRequired().HasMaxLength(40);
        b.HasIndex(x => new { x.UserId, x.Tag }).IsUnique();

        b.HasOne(x => x.User)
            .WithMany(u => u.DietaryTags)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
