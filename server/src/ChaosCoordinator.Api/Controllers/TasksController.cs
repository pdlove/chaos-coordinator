using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/tasks")]
public class TasksController(
    AppDbContext db,
    ICurrentUserAccessor currentUser,
    HouseholdContext household,
    IHouseholdNotifier notifier
) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<HouseholdTaskDto>>> Get()
    {
        var tasks = await db.HouseholdTasks
            .Include(t => t.Claims).ThenInclude(c => c.User)
            .Where(t => t.HouseholdId == household.HouseholdId)
            .OrderBy(t => t.CreatedAt)
            .ToListAsync();
        return Ok(tasks.Select(t => t.ToDto()).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateHouseholdTaskRequest request)
    {
        var task = new HouseholdTask
        {
            Id = Guid.NewGuid(),
            HouseholdId = household.HouseholdId,
            Title = request.Title,
            Note = request.Note,
            Status = HouseholdTaskStatus.Unclaimed,
            CreatedAt = DateTime.UtcNow,
        };
        db.HouseholdTasks.Add(task);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.TasksChanged);
        return Ok(task.ToDto());
    }

    [HttpPost("{id:guid}/claim")]
    public async Task<IActionResult> Claim(Guid id)
    {
        if (currentUser.UserId is not { } uid) return BadRequest(new { error = "no_profile_selected" });

        var task = await db.HouseholdTasks.Include(t => t.Claims).FirstOrDefaultAsync(t => t.Id == id && t.HouseholdId == household.HouseholdId);
        if (task is null) return NotFound();

        if (task.Claims.All(c => c.UserId != uid))
        {
            task.Claims.Add(new TaskClaim { TaskId = task.Id, UserId = uid });
        }
        task.Status = HouseholdTaskStatus.Claimed;

        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.TasksChanged);
        return NoContent();
    }

    [HttpPost("{id:guid}/unclaim")]
    public async Task<IActionResult> Unclaim(Guid id)
    {
        if (currentUser.UserId is not { } uid) return BadRequest(new { error = "no_profile_selected" });

        var task = await db.HouseholdTasks.Include(t => t.Claims).FirstOrDefaultAsync(t => t.Id == id && t.HouseholdId == household.HouseholdId);
        if (task is null) return NotFound();

        var claim = task.Claims.FirstOrDefault(c => c.UserId == uid);
        if (claim is not null) db.TaskClaims.Remove(claim);
        if (task.Claims.Count <= 1) task.Status = HouseholdTaskStatus.Unclaimed;

        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.TasksChanged);
        return NoContent();
    }

    [HttpPost("{id:guid}/complete")]
    public async Task<IActionResult> Complete(Guid id)
    {
        var task = await db.HouseholdTasks.FirstOrDefaultAsync(t => t.Id == id && t.HouseholdId == household.HouseholdId);
        if (task is null) return NotFound();

        task.Status = HouseholdTaskStatus.Done;
        task.CompletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.TasksChanged);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Delete(Guid id)
    {
        var task = await db.HouseholdTasks.FirstOrDefaultAsync(t => t.Id == id && t.HouseholdId == household.HouseholdId);
        if (task is null) return NotFound();

        db.HouseholdTasks.Remove(task);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.TasksChanged);
        return NoContent();
    }
}
