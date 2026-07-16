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

    /// <summary>"Leave by" date/time — stored absolute (not a raw minute count) so it's directly
    /// filterable/queryable once delivery infra exists. Null = no travel time set. The UI
    /// displays/edits this as a minutes-before-Start offset and recomputes it whenever Start
    /// changes, to keep the offset (not the absolute time) stable.</summary>
    public DateTime? TravelTimeLeaveBy { get; set; }

    /// <summary>Comma-separated minutes-before-Start offsets, e.g. "10,60,1440". Storage/display
    /// only for now — no delivery infrastructure (push/email) in this pass.</summary>
    public string? Reminders { get; set; }

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
