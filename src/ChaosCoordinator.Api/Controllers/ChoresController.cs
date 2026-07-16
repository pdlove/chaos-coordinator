using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Api.Services;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/chores")]
public class ChoresController(
    AppDbContext db,
    ICurrentUserAccessor currentUser,
    HouseholdContext household,
    IPinElevationStore pinElevation,
    IHouseholdNotifier notifier,
    PushNotificationService push
) : ControllerBase
{
    [HttpPost]
    [RequirePinElevation]
    public async Task<IActionResult> Create(CreateChoreRequest request)
    {
        var group = await db.ChoreGroups.FirstOrDefaultAsync(g => g.Id == request.GroupId && g.HouseholdId == household.HouseholdId);
        if (group is null) return NotFound(new { error = "group_not_found" });

        var chore = new Chore
        {
            Id = Guid.NewGuid(),
            GroupId = request.GroupId,
            Title = request.Title,
            Instructions = request.Instructions,
            RecurrenceType = request.RecurrenceType,
            RecurrenceDays = request.RecurrenceDays,
            PhotoRequired = request.PhotoRequired,
            AlarmTime = request.AlarmTime is { } alarm ? TimeOnly.Parse(alarm) : null,
            Assignments = request.AssigneeUserIds.Select(uid => new ChoreAssignment { UserId = uid }).ToList(),
        };
        db.Chores.Add(chore);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ChoresChanged);

        // Assignments were attached above with only UserId set (no tracked User to populate the
        // reference nav from) — reload with the include so the response DTO's assignees aren't
        // silently empty, matching EventsController.Create's Reload pattern.
        var reloaded = await db.Chores.Include(c => c.Assignments).ThenInclude(a => a.User)
            .SingleAsync(c => c.Id == chore.Id);
        return Ok(reloaded.ToDto(DateOnly.FromDateTime(DateTime.Today)));
    }

    [HttpPatch("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Update(Guid id, UpdateChoreRequest request)
    {
        var chore = await db.Chores.Include(c => c.Assignments).Include(c => c.Group)
            .FirstOrDefaultAsync(c => c.Id == id && c.Group!.HouseholdId == household.HouseholdId);
        if (chore is null) return NotFound();

        chore.Title = request.Title;
        chore.Instructions = request.Instructions;
        chore.RecurrenceType = request.RecurrenceType;
        chore.RecurrenceDays = request.RecurrenceDays;
        chore.PhotoRequired = request.PhotoRequired;
        chore.AlarmTime = request.AlarmTime is { } alarm ? TimeOnly.Parse(alarm) : null;

        db.ChoreAssignments.RemoveRange(chore.Assignments);
        chore.Assignments = request.AssigneeUserIds.Select(uid => new ChoreAssignment { ChoreId = chore.Id, UserId = uid }).ToList();

        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ChoresChanged);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Delete(Guid id)
    {
        var chore = await db.Chores.Include(c => c.Group).FirstOrDefaultAsync(c => c.Id == id && c.Group!.HouseholdId == household.HouseholdId);
        if (chore is null) return NotFound();

        db.Chores.Remove(chore);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ChoresChanged);
        return NoContent();
    }

    /// <summary>Assignees can check off their own chore; anyone else needs a verified parent PIN
    /// (e.g. a parent marking it complete on a kid's behalf).</summary>
    [HttpPost("{id:guid}/complete")]
    public async Task<IActionResult> Complete(Guid id, CompleteChoreRequest request)
    {
        var chore = await db.Chores.Include(c => c.Assignments).Include(c => c.Group)
            .FirstOrDefaultAsync(c => c.Id == id && c.Group!.HouseholdId == household.HouseholdId);
        if (chore is null) return NotFound();

        var isAssignee = currentUser.UserId is { } uid && chore.Assignments.Any(a => a.UserId == uid);
        if (!isAssignee && !pinElevation.IsElevated(HttpContext.Session.Id))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "pin_required" });
        }

        if (chore.PhotoRequired && string.IsNullOrEmpty(request.PhotoUrl))
        {
            return BadRequest(new { error = "photo_required" });
        }

        var completedById = currentUser.UserId ?? chore.Assignments.First().UserId;
        var existing = await db.ChoreCompletions.FirstOrDefaultAsync(x => x.ChoreId == id && x.Date == request.Date);
        var isNewCompletion = existing is null;
        if (isNewCompletion)
        {
            db.ChoreCompletions.Add(new ChoreCompletion
            {
                Id = Guid.NewGuid(),
                ChoreId = id,
                Date = request.Date,
                CompletedById = completedById,
                CompletedAt = DateTime.UtcNow,
                PhotoUrl = request.PhotoUrl,
            });
        }

        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ChoresChanged);

        // Only on an actual new completion, not a no-op re-post of an already-completed chore.
        if (isNewCompletion)
        {
            var completer = await db.Users.SingleAsync(u => u.Id == completedById);
            var adultIds = await db.Users
                .Where(u => u.HouseholdId == household.HouseholdId && u.Role == Role.Adult && u.Id != completedById)
                .Select(u => u.Id)
                .ToListAsync();
            await push.NotifyUsersAsync(adultIds, new PushPayload(chore.Title, $"{completer.Name} finished this chore"));
        }

        return NoContent();
    }

    [HttpDelete("{id:guid}/complete/{date}")]
    public async Task<IActionResult> Uncomplete(Guid id, DateOnly date)
    {
        var chore = await db.Chores.Include(c => c.Assignments).Include(c => c.Group)
            .FirstOrDefaultAsync(c => c.Id == id && c.Group!.HouseholdId == household.HouseholdId);
        if (chore is null) return NotFound();

        var isAssignee = currentUser.UserId is { } uid && chore.Assignments.Any(a => a.UserId == uid);
        if (!isAssignee && !pinElevation.IsElevated(HttpContext.Session.Id))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "pin_required" });
        }

        var completion = await db.ChoreCompletions.FirstOrDefaultAsync(x => x.ChoreId == id && x.Date == date);
        if (completion is not null)
        {
            db.ChoreCompletions.Remove(completion);
            await db.SaveChangesAsync();
            await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ChoresChanged);
        }

        return NoContent();
    }
}
