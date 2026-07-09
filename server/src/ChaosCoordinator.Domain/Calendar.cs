namespace ChaosCoordinator.Domain;

public class CalendarEvent
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public string Title { get; set; } = "";
    public DateTime Start { get; set; }
    public DateTime? End { get; set; }
    public EventCategory Category { get; set; }
    public string? Location { get; set; }
    public string? Notes { get; set; }

    /// <summary>Null = does not repeat. Otherwise: comma-separated DayOfWeek ints (0=Sun…6=Sat),
    /// e.g. "1,3" for every Monday and Wednesday. The event repeats at the same time of day as
    /// Start, with the same duration, on the matching days from Start.Date through RecurrenceEnd.</summary>
    public string? RecurrenceDays { get; set; }

    /// <summary>Inclusive end date for the recurrence. Null = repeats indefinitely (server caps
    /// expansion to the requested query window).</summary>
    public DateTime? RecurrenceEnd { get; set; }

    public Guid OwnerId { get; set; }
    public User? Owner { get; set; }

    public DateTime CreatedAt { get; set; }

    public ICollection<EventAttendee> Attendees { get; set; } = new List<EventAttendee>();
    public ICollection<EventException> Exceptions { get; set; } = new List<EventException>();
}

/// <summary>Join table: which household members attend a given event (owner is implicitly an attendee).</summary>
public class EventAttendee
{
    public Guid EventId { get; set; }
    public CalendarEvent? Event { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }
}

/// <summary>A cancelled (skipped) occurrence of a recurring event.</summary>
public class EventException
{
    public Guid EventId { get; set; }
    public CalendarEvent? Event { get; set; }

    /// <summary>The calendar date of the cancelled occurrence.</summary>
    public DateOnly Date { get; set; }
}
