using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController(AppDbContext db, HouseholdContext household, IHouseholdNotifier notifier) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> Get()
    {
        var users = await db.Users.Where(u => u.HouseholdId == household.HouseholdId).OrderBy(u => u.Order).ToListAsync();
        return Ok(users.Select(u => u.ToDto()).ToList());
    }

    [HttpPost]
    [RequirePinElevation]
    public async Task<IActionResult> Create(CreateUserRequest request)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            HouseholdId = household.HouseholdId,
            Name = request.Name,
            Initials = request.Initials,
            Color = request.Color,
            Role = request.Role,
            Order = request.Order,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.HouseholdChanged);
        return Ok(user.ToDto());
    }

    [HttpPatch("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Update(Guid id, UpdateUserRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.HouseholdId == household.HouseholdId);
        if (user is null) return NotFound();

        user.Name = request.Name;
        user.Initials = request.Initials;
        user.Color = request.Color;
        user.Role = request.Role;
        user.Order = request.Order;
        if (user.Role != Role.Parent) user.PinHash = null;

        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.HouseholdChanged);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.HouseholdId == household.HouseholdId);
        if (user is null) return NotFound();

        db.Users.Remove(user);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.HouseholdChanged);
        return NoContent();
    }

    /// <summary>Sets/resets a parent's PIN. PIN-gated itself — you need an already-verified
    /// parent PIN to set anyone's PIN, including your own (avoids a bootstrapping hole where
    /// changing your PIN would need... your PIN. First-ever PIN is set via the seed data).</summary>
    [HttpPost("{id:guid}/pin")]
    [RequirePinElevation]
    public async Task<IActionResult> SetPin(Guid id, SetPinRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.HouseholdId == household.HouseholdId && u.Role == Role.Parent);
        if (user is null) return NotFound();

        user.PinHash = BCrypt.Net.BCrypt.HashPassword(request.Pin);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:guid}/dietary-tags")]
    public async Task<ActionResult<List<DietaryTagDto>>> GetDietaryTags(Guid id)
    {
        var tags = await db.DietaryTags.Where(t => t.UserId == id && t.User!.HouseholdId == household.HouseholdId).ToListAsync();
        return Ok(tags.Select(t => new DietaryTagDto(t.Id, t.Tag)).ToList());
    }

    [HttpPost("{id:guid}/dietary-tags")]
    public async Task<IActionResult> AddDietaryTag(Guid id, CreateDietaryTagRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.HouseholdId == household.HouseholdId);
        if (user is null) return NotFound();

        var tag = new DietaryTag { Id = Guid.NewGuid(), UserId = id, Tag = request.Tag };
        db.DietaryTags.Add(tag);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.HouseholdChanged);
        return Ok(new DietaryTagDto(tag.Id, tag.Tag));
    }

    [HttpDelete("{id:guid}/dietary-tags/{tagId:guid}")]
    public async Task<IActionResult> DeleteDietaryTag(Guid id, Guid tagId)
    {
        var tag = await db.DietaryTags.FirstOrDefaultAsync(t => t.Id == tagId && t.UserId == id);
        if (tag is null) return NotFound();

        db.DietaryTags.Remove(tag);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.HouseholdChanged);
        return NoContent();
    }
}
