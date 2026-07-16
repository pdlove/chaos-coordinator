using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/saved-locations")]
public class SavedLocationsController(AppDbContext db, HouseholdContext household, IHouseholdNotifier notifier) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<SavedLocationDto>>> Get()
    {
        var locations = await db.SavedLocations
            .Where(l => l.HouseholdId == household.HouseholdId)
            .OrderBy(l => l.Order)
            .Select(l => l.ToDto())
            .ToListAsync();
        return Ok(locations);
    }

    [HttpPost]
    [RequirePinElevation]
    public async Task<IActionResult> Create(CreateSavedLocationRequest request)
    {
        var location = new SavedLocation
        {
            Id = Guid.NewGuid(),
            HouseholdId = household.HouseholdId,
            Name = request.Name,
            Address = request.Address,
            Order = request.Order,
        };
        db.SavedLocations.Add(location);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return Ok(location.ToDto());
    }

    [HttpPatch("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Update(Guid id, UpdateSavedLocationRequest request)
    {
        var location = await db.SavedLocations.FirstOrDefaultAsync(l => l.Id == id && l.HouseholdId == household.HouseholdId);
        if (location is null) return NotFound();

        location.Name = request.Name;
        location.Address = request.Address;
        location.Order = request.Order;
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Delete(Guid id)
    {
        var location = await db.SavedLocations.FirstOrDefaultAsync(l => l.Id == id && l.HouseholdId == household.HouseholdId);
        if (location is null) return NotFound();

        db.SavedLocations.Remove(location);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return NoContent();
    }
}
