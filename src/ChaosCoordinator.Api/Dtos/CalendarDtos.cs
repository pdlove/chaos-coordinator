using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Dtos;

public record CategoryDto(Guid Id, string Name, string Color, int Order);

public record SavedLocationDto(Guid Id, string Name, string? Address, int Order);

public record CreateCalendarCategoryRequest(string Name, string Color, int Order);
public record UpdateCalendarCategoryRequest(string Name, string Color, int Order);

public record CreateSavedLocationRequest(string Name, string? Address, int Order);
public record UpdateSavedLocationRequest(string Name, string? Address, int Order);

public record CalendarEventDto(
    Guid Id,
    string Title,
    DateTime Start,
    DateTime? End,
    CategoryDto Category,
    string? Location,
    string? Notes,
    Guid OwnerId,
    string OwnerName,
    List<UserDto> Attendees,
    DateTime CreatedAt,
    bool IsOwnedByCurrentUser,
    /// <summary>Null = non-recurring.</summary>
    RecurrenceFrequency? RecurrenceFrequency,
    /// <summary>Repeat every N days/weeks/months, per RecurrenceFrequency.</summary>
    int RecurrenceInterval,
    /// <summary>Weekly only: comma-separated DayOfWeek ints (0=Sun…6=Sat), e.g. "1,3".</summary>
    string? RecurrenceDays,
    /// <summary>Monthly "specific date" mode: day of month, or -1 for last day.</summary>
    int? RecurrenceMonthDay,
    /// <summary>Monthly "nth weekday" mode: 1-4, or -1 for last. Pairs with RecurrenceWeekday.</summary>
    int? RecurrenceWeekOrdinal,
    /// <summary>Monthly "nth weekday" mode: DayOfWeek int (0=Sun…6=Sat).</summary>
    int? RecurrenceWeekday,
    /// <summary>Inclusive end date of the recurrence series. Null = open-ended.</summary>
    DateTime? RecurrenceEnd,
    /// <summary>For recurring event instances: the Start of this specific occurrence.
    /// Null for non-recurring events. Send this value to POST /api/events/{id}/exceptions
    /// to cancel just this occurrence.</summary>
    DateTime? InstanceDate,
    /// <summary>"Leave by" date/time. Null = no travel time set. Compute a minutes-before-Start
    /// offset for display as (Start - TravelTimeLeaveBy); recompute this field (not just display)
    /// whenever Start changes, to keep the offset stable.</summary>
    DateTime? TravelTimeLeaveBy,
    /// <summary>Comma-separated minutes-before-Start offsets, e.g. "10,60,1440". Storage/display
    /// only — no delivery infrastructure yet.</summary>
    string? Reminders,
    /// <summary>Source image(s) this event was created from via the photo-import flow, if any —
    /// empty when the event was created the normal way. Callers must .Include(e => e.ImportBatch)
    /// .ThenInclude(b => b!.Images) before calling ToDto for this to populate.</summary>
    List<string> SourceImageUrls
);

public record CreateEventRequest(
    string Title,
    DateTime Start,
    DateTime? End,
    Guid CategoryId,
    string? Location,
    string? Notes,
    List<Guid> AttendeeUserIds,
    RecurrenceFrequency? RecurrenceFrequency,
    int RecurrenceInterval,
    string? RecurrenceDays,
    int? RecurrenceMonthDay,
    int? RecurrenceWeekOrdinal,
    int? RecurrenceWeekday,
    DateTime? RecurrenceEnd,
    DateTime? TravelTimeLeaveBy,
    string? Reminders
);

public record UpdateEventRequest(
    string Title,
    DateTime Start,
    DateTime? End,
    Guid CategoryId,
    string? Location,
    string? Notes,
    List<Guid> AttendeeUserIds,
    RecurrenceFrequency? RecurrenceFrequency,
    int RecurrenceInterval,
    string? RecurrenceDays,
    int? RecurrenceMonthDay,
    int? RecurrenceWeekOrdinal,
    int? RecurrenceWeekday,
    DateTime? RecurrenceEnd,
    DateTime? TravelTimeLeaveBy,
    string? Reminders
);

public record CancelOccurrenceRequest(DateTime Date);

/// <summary>Edit just one occurrence of a recurring event ("this event only") — upserts an
/// EventException with Cancelled = false and these overrides.</summary>
public record EditOccurrenceRequest(
    DateTime Date,
    string Title,
    DateTime Start,
    DateTime? End,
    Guid CategoryId,
    string? Location,
    string? Notes
);

/// <summary>Edit "this and following" occurrences — truncates the original series at Date and
/// creates a new series starting at Date with the edited fields, continuing the same recurrence
/// pattern (or the new one, if RecurrenceFrequency/etc. were also changed).</summary>
public record SplitSeriesRequest(
    DateTime Date,
    string Title,
    DateTime Start,
    DateTime? End,
    Guid CategoryId,
    string? Location,
    string? Notes,
    List<Guid> AttendeeUserIds,
    RecurrenceFrequency? RecurrenceFrequency,
    int RecurrenceInterval,
    string? RecurrenceDays,
    int? RecurrenceMonthDay,
    int? RecurrenceWeekOrdinal,
    int? RecurrenceWeekday,
    DateTime? TravelTimeLeaveBy,
    string? Reminders
);

/// <summary>"This and following" delete — just truncates the series at Date, no continuation.</summary>
public record TruncateSeriesRequest(DateTime Date);

public static class CalendarDtoMapping
{
    public static CategoryDto ToDto(this CalendarCategory c) => new(c.Id, c.Name, c.Color, c.Order);

    public static SavedLocationDto ToDto(this SavedLocation l) => new(l.Id, l.Name, l.Address, l.Order);

    /// <summary>occurrenceOverride: the EventException for this occurrence's date, if any
    /// (Cancelled occurrences are filtered out by the caller before reaching here — see
    /// EventsController.Get — so any override passed in here is an edit, not a cancellation).
    /// Callers must .Include(e => e.Category) (and, when passing an override, its .Category too)
    /// before calling this.</summary>
    public static CalendarEventDto ToDto(
        this CalendarEvent e, Guid? currentUserId, DateTime? instanceDate, EventException? occurrenceOverride = null)
    {
        DateTime dtoStart;
        DateTime? dtoEnd;
        DateTime? dtoTravelTimeLeaveBy;

        if (instanceDate.HasValue)
        {
            // Shift the start/end/leave-by to this occurrence's date while keeping the same time of day
            var shift = instanceDate.Value.Date - e.Start.Date;
            dtoStart = e.Start + shift;
            dtoEnd = e.End.HasValue ? e.End.Value + shift : null;
            dtoTravelTimeLeaveBy = e.TravelTimeLeaveBy.HasValue ? e.TravelTimeLeaveBy.Value + shift : null;
        }
        else
        {
            dtoStart = e.Start;
            dtoEnd = e.End;
            dtoTravelTimeLeaveBy = e.TravelTimeLeaveBy;
        }

        var title = e.Title;
        var location = e.Location;
        var notes = e.Notes;
        var category = e.Category!.ToDto();
        if (occurrenceOverride is not null)
        {
            title = occurrenceOverride.Title ?? title;
            dtoStart = occurrenceOverride.Start ?? dtoStart;
            dtoEnd = occurrenceOverride.End ?? dtoEnd;
            location = occurrenceOverride.Location ?? location;
            notes = occurrenceOverride.Notes ?? notes;
            category = occurrenceOverride.Category?.ToDto() ?? category;
        }

        return new CalendarEventDto(
            e.Id, title, dtoStart, dtoEnd,
            category, location, notes,
            e.OwnerId, e.Owner?.Name ?? "",
            e.Attendees.Where(a => a.User is not null).Select(a => a.User!.ToDto()).ToList(),
            e.CreatedAt,
            currentUserId is not null && e.OwnerId == currentUserId,
            e.RecurrenceFrequency,
            e.RecurrenceInterval,
            e.RecurrenceDays,
            e.RecurrenceMonthDay,
            e.RecurrenceWeekOrdinal,
            e.RecurrenceWeekday,
            e.RecurrenceEnd,
            instanceDate,
            dtoTravelTimeLeaveBy,
            e.Reminders,
            e.ImportBatch?.Images.OrderBy(i => i.Order).Select(i => i.ImageUrl).ToList() ?? []
        );
    }
}
