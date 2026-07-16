using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChaosCoordinator.Data.Configurations;

public class PushSubscriptionConfiguration : IEntityTypeConfiguration<PushSubscription>
{
    public void Configure(EntityTypeBuilder<PushSubscription> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Endpoint).IsRequired().HasMaxLength(500);
        b.Property(x => x.P256dh).IsRequired().HasMaxLength(200);
        b.Property(x => x.Auth).IsRequired().HasMaxLength(200);
        b.HasIndex(x => x.Endpoint).IsUnique();

        b.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class SentReminderConfiguration : IEntityTypeConfiguration<SentReminder>
{
    public void Configure(EntityTypeBuilder<SentReminder> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Kind).HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.Key).IsRequired().HasMaxLength(100);
        b.HasIndex(x => new { x.Kind, x.SourceId, x.Key }).IsUnique();
    }
}
