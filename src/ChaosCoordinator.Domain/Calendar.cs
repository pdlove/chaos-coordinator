namespace ChaosCoordinator.Domain;

public class CalendarEvent
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public string Title { get; set; } = "";
    public DateTime Start { get; set; }
    public DateTime? End { get; set; }
    public Guid CategoryId { get; set; }
    public CalendarCategory? Category { get; set; }
    public string? Location { get; set; }
    public string? Notes { get; set; }

    /// <summary>Null = does not repeat. See RecurrenceExpander for how the frequency-specific
    /// fields below combine to produce occurrences.</summary>
    public RecurrenceFrequency? RecurrenceFrequency { get; set; }

    /// <summary>Repeat every N days/weeks/months, depending on RecurrenceFrequency. Default 1
    /// (every day/week/month).</summary>
    public int RecurrenceInterval { get; set; } = 1;

    /// <summary>Weekly only: comma-separated DayOfWeek ints (0=Sun…6=Sat), e.g. "1,3" for every
    /// Monday and Wednesday.</summary>
    public string? RecurrenceDays { get; set; }

    /// <summary>Monthly "specific date" mode: day of month (1-31), or -1 for "last day of the
    /// month". Mutually exclusive with RecurrenceWeekOrdinal/RecurrenceWeekday.</summary>
    public int? RecurrenceMonthDay { get; set; }

    /// <summary>Monthly "nth weekday" mode: 1-4 for first..fourth, -1 for "last". Pairs with
    /// RecurrenceWeekday, e.g. (2, Tuesday) = "the second Tuesday". Mutually exclusive with
    /// RecurrenceMonthDay.</summary>
    public int? RecurrenceWeekOrdinal { get; set; }

    /// <summary>Monthly "nth weekday" mode: DayOfWeek int (0=Sun…6=Sat) paired with RecurrenceWeekOrdinal.</summary>
    public int? RecurrenceWeekday { get; set; }

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

    /// <summary>Set when this event was created via the photo/paste-text import flow — links
    /// back to the batch (and therefore its source image(s)/pasted text) it came from. Null for
    /// events created the normal way.</summary>
    public Guid? ImportBatchId { get; set; }
    public EventImportBatch? ImportBatch { get; set; }

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

/// <summary>An override for one occurrence of a recurring event — either a cancellation (skip
/// this occurrence entirely) or an edit of just this instance (Cancelled = false, with one or
/// more override fields set). Attendees/travel-time/reminders are not overridable per-instance;
/// those stay series-level even when Cancelled is false.</summary>
public class EventException
{
    public Guid EventId { get; set; }
    public CalendarEvent? Event { get; set; }

    /// <summary>The calendar date of the occurrence being overridden.</summary>
    public DateOnly Date { get; set; }

    public bool Cancelled { get; set; } = true;

    public string? Title { get; set; }
    public DateTime? Start { get; set; }
    public DateTime? End { get; set; }
    public string? Location { get; set; }
    public string? Notes { get; set; }
    public Guid? CategoryId { get; set; }
    public CalendarCategory? Category { get; set; }
}

/// <summary>A household-scoped calendar event category (e.g. "Work", "School") — replaces what
/// used to be a fixed compiled-in enum so households can add/rename/remove their own. Every
/// household gets 6 defaults (Work/School/Doctor/Home/Personal/Activities) at registration —
/// see AuthController.Register — matching what existing households were backfilled with when
/// this was converted from an enum (see the AddCalendarCategoriesAndLocations migration).</summary>
public class CalendarCategory
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public string Name { get; set; } = "";
    /// <summary>Hex color, e.g. "#4C8BF5" — used as-is for text/accents, and at reduced opacity
    /// for pill backgrounds (see CategoryPill.tsx).</summary>
    public string Color { get; set; } = "";
    public int Order { get; set; }
}

/// <summary>A household-scoped saved location (name + optional address) — suggested via
/// autocomplete on the event form's Location field, which otherwise stays free text (typing
/// something new is always allowed; nothing here is a hard reference from CalendarEvent).</summary>
public class SavedLocation
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public string Name { get; set; } = "";
    public string? Address { get; set; }
    public int Order { get; set; }
}

/// <summary>One "create events from a photo/pasted text" submission — the unit the user reviews
/// and confirms/discards as a group. Images are stored as soon as they're uploaded (see
/// EventImportController.Extract), independent of whether the user goes on to confirm any events,
/// so the source is never lost. A single batch can produce several CalendarEvents (e.g. a
/// newsletter photo listing five dates), and a single event's source can span more than one image
/// (e.g. a two-page flyer) — both are covered by CalendarEvent.ImportBatchId pointing back here
/// rather than a many-to-many join table.</summary>
public class EventImportBatch
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public Guid CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>Pasted-text source, if that's how this batch was submitted (instead of, or
    /// alongside, images).</summary>
    public string? PastedText { get; set; }

    public ICollection<EventImportImage> Images { get; set; } = new List<EventImportImage>();
}

/// <summary>One uploaded source image belonging to an EventImportBatch.</summary>
public class EventImportImage
{
    public Guid Id { get; set; }
    public Guid BatchId { get; set; }
    public EventImportBatch? Batch { get; set; }

    public string ImageUrl { get; set; } = "";
    public int Order { get; set; }
}
