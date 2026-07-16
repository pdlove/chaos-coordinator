using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Dtos;

public record HouseholdTaskDto(
    Guid Id,
    string Title,
    string? Note,
    HouseholdTaskStatus Status,
    List<UserDto> ClaimedBy,
    DateTime CreatedAt,
    DateTime? CompletedAt
);

public record CreateHouseholdTaskRequest(string Title, string? Note);

public static class TaskDtoMapping
{
    public static HouseholdTaskDto ToDto(this HouseholdTask t) => new(
        t.Id, t.Title, t.Note, t.Status,
        t.Claims.Where(c => c.User is not null).Select(c => c.User!.ToDto()).ToList(),
        t.CreatedAt, t.CompletedAt
    );
}
