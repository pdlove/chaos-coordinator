namespace ChaosCoordinator.Domain;

public class CalendarEvent
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public string Title { get; set; } = "";
    public DateTime Start { get; set; }
    public DateTime? End { get; set; }
    public EventCategory Category { get; set; }
    public string? Notes { get; set; }

    public Guid OwnerId { get; set; }
    public User? Owner { get; set; }

    public DateTime CreatedAt { get; set; }

    public ICollection<EventAttendee> Attendees { get; set; } = new List<EventAttendee>();
}

/// <summary>Join table: which household members attend a given event (owner is implicitly an attendee).</summary>
public class EventAttendee
{
    public Guid EventId { get; set; }
    public CalendarEvent? Event { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }
}
