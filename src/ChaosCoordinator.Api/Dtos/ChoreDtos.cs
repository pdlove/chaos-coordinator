using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Dtos;

public record ChoreDto(
    Guid Id,
    Guid GroupId,
    string Title,
    string? Instructions,
    RecurrenceType RecurrenceType,
    string? RecurrenceDays,
    bool PhotoRequired,
    List<UserDto> Assignees,
    bool CompletedToday,
    DateTime? CompletedAt,
    string? CompletedByName,
    string? PhotoUrl
);

public record ChoreGroupDto(Guid Id, string Name, string DoneByTime, int Order, List<ChoreDto> Chores);

public record CreateChoreGroupRequest(string Name, string DoneByTime, int Order);
public record UpdateChoreGroupRequest(string Name, string DoneByTime, int Order);

public record CreateChoreRequest(
    Guid GroupId,
    string Title,
    string? Instructions,
    RecurrenceType RecurrenceType,
    string? RecurrenceDays,
    bool PhotoRequired,
    List<Guid> AssigneeUserIds
);

public record UpdateChoreRequest(
    string Title,
    string? Instructions,
    RecurrenceType RecurrenceType,
    string? RecurrenceDays,
    bool PhotoRequired,
    List<Guid> AssigneeUserIds
);

public record CompleteChoreRequest(DateOnly Date, string? PhotoUrl);

public static class ChoreDtoMapping
{
    public static ChoreDto ToDto(this Chore c, DateOnly date)
    {
        var completion = c.Completions.FirstOrDefault(x => x.Date == date);
        return new ChoreDto(
            c.Id, c.GroupId, c.Title, c.Instructions, c.RecurrenceType, c.RecurrenceDays, c.PhotoRequired,
            c.Assignments.Where(a => a.User is not null).Select(a => a.User!.ToDto()).ToList(),
            completion is not null,
            completion?.CompletedAt,
            completion?.CompletedBy?.Name,
            completion?.PhotoUrl
        );
    }
}
