using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Dtos;

public record ProjectTaskDto(Guid Id, string Title, bool Done, Guid? AssigneeId, string? AssigneeName, int Order);

public record ProjectSummaryDto(Guid Id, string Name, int TotalCount, int DoneCount, List<UserDto> Contributors);

public record ProjectDetailDto(Guid Id, string Name, List<ProjectTaskDto> Tasks);

public record CreateProjectRequest(string Name);
public record CreateProjectTaskRequest(string Title, Guid? AssigneeId);
public record UpdateProjectTaskRequest(string Title, bool Done, Guid? AssigneeId, int Order);

public static class ProjectDtoMapping
{
    public static ProjectTaskDto ToDto(this ProjectTask t) => new(t.Id, t.Title, t.Done, t.AssigneeId, t.Assignee?.Name, t.Order);

    public static ProjectSummaryDto ToSummaryDto(this Project p)
    {
        var contributors = p.Tasks
            .Where(t => t.Assignee is not null)
            .Select(t => t.Assignee!)
            .DistinctBy(u => u.Id)
            .Select(u => u.ToDto())
            .ToList();
        return new ProjectSummaryDto(p.Id, p.Name, p.Tasks.Count, p.Tasks.Count(t => t.Done), contributors);
    }

    public static ProjectDetailDto ToDetailDto(this Project p) =>
        new(p.Id, p.Name, p.Tasks.OrderBy(t => t.Order).Select(t => t.ToDto()).ToList());
}
