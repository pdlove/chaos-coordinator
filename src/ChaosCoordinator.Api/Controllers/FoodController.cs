using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api")]
public class FoodController(AppDbContext db, HouseholdContext household, IHouseholdNotifier notifier) : ControllerBase
{
    private IQueryable<MenuEntry> MenuQuery() => db.MenuEntries
        .Include(m => m.Recipe)
        .Include(m => m.Eaters).ThenInclude(e => e.User).ThenInclude(u => u!.DietaryTags)
        .Include(m => m.Substitutions).ThenInclude(s => s.ForUser)
        .AsSplitQuery()
        .Where(m => m.HouseholdId == household.HouseholdId);

    [HttpGet("menu")]
    public async Task<ActionResult<List<MenuEntryDto>>> GetMenu([FromQuery] DateOnly from, [FromQuery] DateOnly to)
    {
        var entries = await MenuQuery().Where(m => m.Date >= from && m.Date <= to).ToListAsync();
        return Ok(entries.OrderBy(e => e.Date).ThenBy(e => e.MealType).Select(e => e.ToDto()).ToList());
    }

    /// <summary>Create-or-replace for a given (date, mealType) — matches the unique index, so a
    /// household only ever has one entry per meal slot per day.</summary>
    [HttpPost("menu")]
    public async Task<IActionResult> UpsertMenu(UpsertMenuEntryRequest request)
    {
        var entry = await db.MenuEntries.Include(m => m.Eaters)
            .FirstOrDefaultAsync(m => m.HouseholdId == household.HouseholdId && m.Date == request.Date && m.MealType == request.MealType);

        if (entry is null)
        {
            entry = new MenuEntry { Id = Guid.NewGuid(), HouseholdId = household.HouseholdId, Date = request.Date, MealType = request.MealType };
            db.MenuEntries.Add(entry);
        }
        else
        {
            db.MenuEaters.RemoveRange(entry.Eaters);
        }

        entry.Dish = request.Dish;
        entry.RecipeId = request.RecipeId;
        entry.Eaters = request.EaterUserIds.Select(uid => new MenuEater { MenuEntryId = entry.Id, UserId = uid }).ToList();

        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.FoodChanged);

        var reloaded = await MenuQuery().SingleAsync(m => m.Id == entry.Id);
        return Ok(reloaded.ToDto());
    }

    [HttpPost("menu/{id:guid}/substitutions")]
    public async Task<IActionResult> AddSubstitution(Guid id, CreateSubstitutionRequest request)
    {
        var entry = await db.MenuEntries.FirstOrDefaultAsync(m => m.Id == id && m.HouseholdId == household.HouseholdId);
        if (entry is null) return NotFound();

        var sub = new Substitution { Id = Guid.NewGuid(), MenuEntryId = id, ForUserId = request.ForUserId, Dish = request.Dish, DietaryLabel = request.DietaryLabel };
        db.Substitutions.Add(sub);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.FoodChanged);
        return Ok(sub.ToDto());
    }

    [HttpDelete("substitutions/{id:guid}")]
    public async Task<IActionResult> DeleteSubstitution(Guid id)
    {
        var sub = await db.Substitutions.Include(s => s.MenuEntry).FirstOrDefaultAsync(s => s.Id == id && s.MenuEntry!.HouseholdId == household.HouseholdId);
        if (sub is null) return NotFound();

        db.Substitutions.Remove(sub);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.FoodChanged);
        return NoContent();
    }

    [HttpGet("recipes")]
    public async Task<ActionResult<List<RecipeDto>>> GetRecipes()
    {
        var recipes = await db.Recipes.Where(r => r.HouseholdId == household.HouseholdId).ToListAsync();
        return Ok(recipes.Select(r => r.ToDto()).ToList());
    }

    [HttpPost("recipes")]
    public async Task<IActionResult> CreateRecipe(CreateRecipeRequest request)
    {
        var recipe = new Recipe { Id = Guid.NewGuid(), HouseholdId = household.HouseholdId, Title = request.Title, PrepMinutes = request.PrepMinutes, CookMinutes = request.CookMinutes, Instructions = request.Instructions };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.FoodChanged);
        return Ok(recipe.ToDto());
    }

    [HttpPatch("recipes/{id:guid}")]
    public async Task<IActionResult> UpdateRecipe(Guid id, UpdateRecipeRequest request)
    {
        var recipe = await db.Recipes.FirstOrDefaultAsync(r => r.Id == id && r.HouseholdId == household.HouseholdId);
        if (recipe is null) return NotFound();

        recipe.Title = request.Title;
        recipe.PrepMinutes = request.PrepMinutes;
        recipe.CookMinutes = request.CookMinutes;
        recipe.Instructions = request.Instructions;
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.FoodChanged);
        return NoContent();
    }
}
