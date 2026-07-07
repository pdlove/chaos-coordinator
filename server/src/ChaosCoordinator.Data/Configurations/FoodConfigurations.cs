using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChaosCoordinator.Data.Configurations;

public class RecipeConfiguration : IEntityTypeConfiguration<Recipe>
{
    public void Configure(EntityTypeBuilder<Recipe> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).IsRequired().HasMaxLength(200);
    }
}

public class MenuEntryConfiguration : IEntityTypeConfiguration<MenuEntry>
{
    public void Configure(EntityTypeBuilder<MenuEntry> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Dish).IsRequired().HasMaxLength(200);
        b.Property(x => x.MealType).HasConversion<string>().HasMaxLength(20);
        b.HasIndex(x => new { x.HouseholdId, x.Date, x.MealType }).IsUnique();

        b.HasOne(x => x.Recipe)
            .WithMany(r => r.MenuEntries)
            .HasForeignKey(x => x.RecipeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

public class MenuEaterConfiguration : IEntityTypeConfiguration<MenuEater>
{
    public void Configure(EntityTypeBuilder<MenuEater> b)
    {
        b.HasKey(x => new { x.MenuEntryId, x.UserId });

        b.HasOne(x => x.MenuEntry)
            .WithMany(m => m.Eaters)
            .HasForeignKey(x => x.MenuEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class SubstitutionConfiguration : IEntityTypeConfiguration<Substitution>
{
    public void Configure(EntityTypeBuilder<Substitution> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Dish).IsRequired().HasMaxLength(200);
        b.Property(x => x.DietaryLabel).IsRequired().HasMaxLength(60);

        b.HasOne(x => x.MenuEntry)
            .WithMany(m => m.Substitutions)
            .HasForeignKey(x => x.MenuEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.ForUser)
            .WithMany()
            .HasForeignKey(x => x.ForUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
