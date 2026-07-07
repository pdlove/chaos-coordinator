using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Dtos;

public record CalendarEventDto(
    Guid Id,
    string Title,
    DateTime Start,
    DateTime? End,
    EventCategory Category,
    string? Notes,
    Guid OwnerId,
    string OwnerName,
    List<UserDto> Attendees,
    DateTime CreatedAt,
    /// <summary>True if the current session's profile owns this event (or no ownership check
    /// applies because no profile is selected — treated as view-only by the client either way).</summary>
    bool IsOwnedByCurrentUser
);

public record CreateEventRequest(
    string Title,
    DateTime Start,
    DateTime? End,
    EventCategory Category,
    string? Notes,
    List<Guid> AttendeeUserIds
);

public record UpdateEventRequest(
    string Title,
    DateTime Start,
    DateTime? End,
    EventCategory Category,
    string? Notes,
    List<Guid> AttendeeUserIds
);

public static class CalendarDtoMapping
{
    public static CalendarEventDto ToDto(this CalendarEvent e, Guid? currentUserId) => new(
        e.Id, e.Title, e.Start, e.End, e.Category, e.Notes,
        e.OwnerId, e.Owner?.Name ?? "",
        e.Attendees.Where(a => a.User is not null).Select(a => a.User!.ToDto()).ToList(),
        e.CreatedAt,
        currentUserId is not null && e.OwnerId == currentUserId
    );
}

