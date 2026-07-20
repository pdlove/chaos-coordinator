using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/chore-groups")]
public class ChoreGroupsController(AppDbContext db, HouseholdContext household, IHouseholdNotifier notifier) : ControllerBase
{
    private const int MaxChoreGroupsPerHousehold = 4;

    [HttpGet]
    public async Task<ActionResult<List<ChoreGroupDto>>> Get([FromQuery] DateOnly date)
    {
        var groups = await db.ChoreGroups
            .Include(g => g.Chores).ThenInclude(c => c.Assignments).ThenInclude(a => a.User)
            .Include(g => g.Chores).ThenInclude(c => c.Completions.Where(x => x.Date == date)).ThenInclude(x => x.CompletedBy)
            .AsSplitQuery()
            .Where(g => g.HouseholdId == household.HouseholdId)
            .OrderBy(g => g.Order)
            .ToListAsync();

        var dtos = groups.Select(g => new ChoreGroupDto(
            g.Id, g.Name, g.DoneByTime.ToString("HH:mm"), g.Order,
            g.Chores.Where(c => ChoreScheduling.IsDueOn(c, date)).Select(c => c.ToDto(date)).ToList()
        )).ToList();

        return Ok(dtos);
    }

    [HttpPost]
    [RequirePinElevation]
    public async Task<IActionResult> Create(CreateChoreGroupRequest request)
    {
        var count = await db.ChoreGroups.CountAsync(g => g.HouseholdId == household.HouseholdId);
        if (count >= MaxChoreGroupsPerHousehold)
        {
            return BadRequest(new { error = "max_groups_reached" });
        }

        var group = new ChoreGroup
        {
            Id = Guid.NewGuid(),
            HouseholdId = household.HouseholdId,
            Name = request.Name,
            DoneByTime = TimeOnly.Parse(request.DoneByTime),
            Order = request.Order,
        };
        db.ChoreGroups.Add(group);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ChoresChanged);
        return Ok(new ChoreGroupDto(group.Id, group.Name, group.DoneByTime.ToString("HH:mm"), group.Order, []));
    }

    [HttpPatch("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Update(Guid id, UpdateChoreGroupRequest request)
    {
        var group = await db.ChoreGroups.FirstOrDefaultAsync(g => g.Id == id && g.HouseholdId == household.HouseholdId);
        if (group is null) return NotFound();

        group.Name = request.Name;
        group.DoneByTime = TimeOnly.Parse(request.DoneByTime);
        group.Order = request.Order;
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ChoresChanged);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Delete(Guid id)
    {
        var group = await db.ChoreGroups.FirstOrDefaultAsync(g => g.Id == id && g.HouseholdId == household.HouseholdId);
        if (group is null) return NotFound();

        db.ChoreGroups.Remove(group);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ChoresChanged);
        return NoContent();
    }
}
