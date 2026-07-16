using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChaosCoordinator.Data.Configurations;

public class CalendarEventConfiguration : IEntityTypeConfiguration<CalendarEvent>
{
    public void Configure(EntityTypeBuilder<CalendarEvent> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).IsRequired().HasMaxLength(200);
        b.Property(x => x.Category).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Location).HasMaxLength(500);
        b.Property(x => x.RecurrenceFrequency).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.RecurrenceDays).HasMaxLength(20);
        b.Property(x => x.Reminders).HasMaxLength(100);
        b.HasIndex(x => new { x.HouseholdId, x.Start });

        b.HasOne(x => x.Owner)
            .WithMany()
            .HasForeignKey(x => x.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class EventAttendeeConfiguration : IEntityTypeConfiguration<EventAttendee>
{
    public void Configure(EntityTypeBuilder<EventAttendee> b)
    {
        b.HasKey(x => new { x.EventId, x.UserId });

        b.HasOne(x => x.Event)
            .WithMany(e => e.Attendees)
            .HasForeignKey(x => x.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class EventExceptionConfiguration : IEntityTypeConfiguration<EventException>
{
    public void Configure(EntityTypeBuilder<EventException> b)
    {
        b.HasKey(x => new { x.EventId, x.Date });
        b.Property(x => x.Title).HasMaxLength(200);
        b.Property(x => x.Location).HasMaxLength(500);
        b.Property(x => x.Category).HasConversion<string>().HasMaxLength(20);

        b.HasOne(x => x.Event)
            .WithMany(e => e.Exceptions)
            .HasForeignKey(x => x.EventId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
