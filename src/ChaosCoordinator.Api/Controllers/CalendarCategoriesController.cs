using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/calendar-categories")]
public class CalendarCategoriesController(AppDbContext db, HouseholdContext household, IHouseholdNotifier notifier) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<CategoryDto>>> Get()
    {
        var categories = await db.CalendarCategories
            .Where(c => c.HouseholdId == household.HouseholdId)
            .OrderBy(c => c.Order)
            .Select(c => c.ToDto())
            .ToListAsync();
        return Ok(categories);
    }

    [HttpPost]
    [RequirePinElevation]
    public async Task<IActionResult> Create(CreateCalendarCategoryRequest request)
    {
        var category = new CalendarCategory
        {
            Id = Guid.NewGuid(),
            HouseholdId = household.HouseholdId,
            Name = request.Name,
            Color = request.Color,
            Order = request.Order,
        };
        db.CalendarCategories.Add(category);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return Ok(category.ToDto());
    }

    [HttpPatch("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Update(Guid id, UpdateCalendarCategoryRequest request)
    {
        var category = await db.CalendarCategories.FirstOrDefaultAsync(c => c.Id == id && c.HouseholdId == household.HouseholdId);
        if (category is null) return NotFound();

        category.Name = request.Name;
        category.Color = request.Color;
        category.Order = request.Order;
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Delete(Guid id)
    {
        var category = await db.CalendarCategories.FirstOrDefaultAsync(c => c.Id == id && c.HouseholdId == household.HouseholdId);
        if (category is null) return NotFound();

        var inUse = await db.CalendarEvents.AnyAsync(e => e.CategoryId == id)
            || await db.EventExceptions.AnyAsync(x => x.CategoryId == id);
        if (inUse) return Conflict(new { error = "category_in_use" });

        db.CalendarCategories.Remove(category);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return NoContent();
    }
}
