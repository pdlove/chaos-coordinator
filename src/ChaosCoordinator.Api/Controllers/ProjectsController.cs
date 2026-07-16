using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/projects")]
public class ProjectsController(AppDbContext db, HouseholdContext household, IHouseholdNotifier notifier) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ProjectSummaryDto>>> Get()
    {
        var projects = await db.Projects
            .Include(p => p.Tasks).ThenInclude(t => t.Assignee)
            .Where(p => p.HouseholdId == household.HouseholdId)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync();
        return Ok(projects.Select(p => p.ToSummaryDto()).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProjectDetailDto>> GetDetail(Guid id)
    {
        var project = await db.Projects
            .Include(p => p.Tasks).ThenInclude(t => t.Assignee)
            .FirstOrDefaultAsync(p => p.Id == id && p.HouseholdId == household.HouseholdId);
        if (project is null) return NotFound();
        return Ok(project.ToDetailDto());
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateProjectRequest request)
    {
        var project = new Project { Id = Guid.NewGuid(), HouseholdId = household.HouseholdId, Name = request.Name, CreatedAt = DateTime.UtcNow };
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ProjectsChanged);
        return Ok(project.ToSummaryDto());
    }

    [HttpDelete("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Delete(Guid id)
    {
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id && p.HouseholdId == household.HouseholdId);
        if (project is null) return NotFound();

        db.Projects.Remove(project);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ProjectsChanged);
        return NoContent();
    }

    [HttpPost("{id:guid}/tasks")]
    public async Task<IActionResult> AddTask(Guid id, CreateProjectTaskRequest request)
    {
        var project = await db.Projects.Include(p => p.Tasks).FirstOrDefaultAsync(p => p.Id == id && p.HouseholdId == household.HouseholdId);
        if (project is null) return NotFound();

        var task = new ProjectTask
        {
            Id = Guid.NewGuid(),
            ProjectId = id,
            Title = request.Title,
            AssigneeId = request.AssigneeId,
            Order = project.Tasks.Count,
        };
        db.ProjectTasks.Add(task);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ProjectsChanged);
        return Ok(task.ToDto());
    }
}

[ApiController]
[Route("api/project-tasks")]
public class ProjectTasksController(AppDbContext db, HouseholdContext household, IHouseholdNotifier notifier) : ControllerBase
{
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateProjectTaskRequest request)
    {
        var task = await db.ProjectTasks.Include(t => t.Project).FirstOrDefaultAsync(t => t.Id == id && t.Project!.HouseholdId == household.HouseholdId);
        if (task is null) return NotFound();

        task.Title = request.Title;
        task.Done = request.Done;
        task.AssigneeId = request.AssigneeId;
        task.Order = request.Order;
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ProjectsChanged);
        return NoContent();
    }
}
