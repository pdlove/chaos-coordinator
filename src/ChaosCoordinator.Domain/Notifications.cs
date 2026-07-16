namespace ChaosCoordinator.Domain;

/// <summary>A browser/device's Web Push endpoint for one user. A user can have several (phone,
/// laptop, etc.) — sends go out to all of them.</summary>
public class PushSubscription
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string Endpoint { get; set; } = "";
    public string P256dh { get; set; } = "";
    public string Auth { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}

public enum SentReminderKind { CalendarEventReminder, ChoreAlarm }

/// <summary>Idempotency record for ReminderCheckService: one row per reminder actually sent, so a
/// periodic sweep never double-sends across ticks or after a restart. SourceId is the EventId or
/// ChoreId; Key disambiguates within that source — for events, "{occurrenceStartIso}:{offsetMinutes}"
/// (a recurring event needs one row per future occurrence per offset); for chores, the ISO date.</summary>
public class SentReminder
{
    public Guid Id { get; set; }
    public SentReminderKind Kind { get; set; }
    public Guid SourceId { get; set; }
    public string Key { get; set; } = "";
    public DateTime SentAt { get; set; }
}
