using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Dtos;

public record CalendarEventDto(
    Guid Id,
    string Title,
    DateTime Start,
    DateTime? End,
    EventCategory Category,
    string? Location,
    string? Notes,
    Guid OwnerId,
    string OwnerName,
    List<UserDto> Attendees,
    DateTime CreatedAt,
    bool IsOwnedByCurrentUser,
    /// <summary>Comma-separated DayOfWeek ints (0=Sun…6=Sat), e.g. "1,3". Null = non-recurring.</summary>
    string? RecurrenceDays,
    /// <summary>Inclusive end date of the recurrence series. Null = open-ended.</summary>
    DateTime? RecurrenceEnd,
    /// <summary>For recurring event instances: the Start of this specific occurrence.
    /// Null for non-recurring events. Send this value to POST /api/events/{id}/exceptions
    /// to cancel just this occurrence.</summary>
    DateTime? InstanceDate
);

public record CreateEventRequest(
    string Title,
    DateTime Start,
    DateTime? End,
    EventCategory Category,
    string? Location,
    string? Notes,
    List<Guid> AttendeeUserIds,
    string? RecurrenceDays,
    DateTime? RecurrenceEnd
);

public record UpdateEventRequest(
    string Title,
    DateTime Start,
    DateTime? End,
    EventCategory Category,
    string? Location,
    string? Notes,
    List<Guid> AttendeeUserIds,
    string? RecurrenceDays,
    DateTime? RecurrenceEnd
);

public record CancelOccurrenceRequest(DateTime Date);

public static class CalendarDtoMapping
{
    public static CalendarEventDto ToDto(this CalendarEvent e, Guid? currentUserId, DateTime? instanceDate)
    {
        DateTime dtoStart;
        DateTime? dtoEnd;

        if (instanceDate.HasValue)
        {
            // Shift the start/end to this occurrence's date while keeping the same time of day
            var shift = instanceDate.Value.Date - e.Start.Date;
            dtoStart = e.Start + shift;
            dtoEnd = e.End.HasValue ? e.End.Value + shift : null;
        }
        else
        {
            dtoStart = e.Start;
            dtoEnd = e.End;
        }

        return new CalendarEventDto(
            e.Id, e.Title, dtoStart, dtoEnd,
            e.Category, e.Location, e.Notes,
            e.OwnerId, e.Owner?.Name ?? "",
            e.Attendees.Where(a => a.User is not null).Select(a => a.User!.ToDto()).ToList(),
            e.CreatedAt,
            currentUserId is not null && e.OwnerId == currentUserId,
            e.RecurrenceDays,
            e.RecurrenceEnd,
            instanceDate
        );
    }
}
