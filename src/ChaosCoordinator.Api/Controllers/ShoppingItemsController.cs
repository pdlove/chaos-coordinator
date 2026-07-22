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
public class ShoppingItemsController(AppDbContext db, HouseholdContext household, IHouseholdNotifier notifier) : ControllerBase
{
    /// <summary>Fuzzy-ish (substring) autocomplete against every item that has ever existed in
    /// this household's stores, grouped by name. See ItemSuggestionDto for why this reads
    /// existing rows rather than a separate catalog.</summary>
    [HttpGet("items/search")]
    public async Task<ActionResult<List<ItemSuggestionDto>>> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q)) return Ok(new List<ItemSuggestionDto>());

        var matches = await db.ShoppingListItems
            .Where(i => i.Store!.HouseholdId == household.HouseholdId && i.Name.ToLower().Contains(q.ToLower()))
            .Include(i => i.PriceHistory)
            .ToListAsync();

        var suggestions = matches
            .GroupBy(i => i.Name, StringComparer.OrdinalIgnoreCase)
            .Select(g =>
            {
                var allHistory = g.SelectMany(i => i.PriceHistory).OrderByDescending(h => h.PaidAt).ToList();
                var mostRecentItem = g.OrderByDescending(i => i.CreatedAt).First();
                return new ItemSuggestionDto(mostRecentItem.Name, mostRecentItem.Department, allHistory.Count, allHistory.FirstOrDefault()?.Price);
            })
            .OrderByDescending(s => s.TimesBought)
            .Take(10)
            .ToList();

        return Ok(suggestions);
    }

    [HttpPatch("items/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateItemRequest request)
    {
        var item = await db.ShoppingListItems.FirstOrDefaultAsync(i => i.Id == id && i.Store!.HouseholdId == household.HouseholdId);
        if (item is null) return NotFound();

        item.Name = request.Name;
        item.Department = request.Department;
        item.Note = request.Note;
        item.Quantity = request.Quantity <= 0 ? 1 : request.Quantity;
        if (request.Checked && !item.Checked) item.CheckedAt = DateTime.UtcNow;
        else if (!request.Checked) item.CheckedAt = null;
        item.Checked = request.Checked;

        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ShoppingChanged);
        return NoContent();
    }

    /// <summary>Checking off with a price records a PriceHistoryEntry and marks it paid/checked —
    /// the "tap an item, enter price paid" flow from the design.</summary>
    [HttpPost("items/{id:guid}/pay")]
    public async Task<IActionResult> Pay(Guid id, PayItemRequest request)
    {
        var item = await db.ShoppingListItems.FirstOrDefaultAsync(i => i.Id == id && i.Store!.HouseholdId == household.HouseholdId);
        if (item is null) return NotFound();

        db.PriceHistoryEntries.Add(new PriceHistoryEntry { Id = Guid.NewGuid(), ItemId = id, Price = request.Price, PaidAt = DateTime.UtcNow });
        item.LastPaidPrice = request.Price;
        item.Checked = true;
        item.CheckedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ShoppingChanged);
        return NoContent();
    }

    [HttpGet("items/{id:guid}/price-history")]
    public async Task<ActionResult<List<PriceHistoryEntryDto>>> PriceHistory(Guid id)
    {
        var history = await db.PriceHistoryEntries
            .Where(h => h.ItemId == id && h.Item!.Store!.HouseholdId == household.HouseholdId)
            .OrderByDescending(h => h.PaidAt)
            .Select(h => new PriceHistoryEntryDto(h.PaidAt, h.Price))
            .ToListAsync();
        return Ok(history);
    }

    /// <summary>Soft delete — see ShoppingListItem.DeletedAt. Idempotent against being called
    /// twice (e.g. a retried request) since it's just re-stamping the same field.</summary>
    [HttpDelete("items/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var item = await db.ShoppingListItems.FirstOrDefaultAsync(i => i.Id == id && i.Store!.HouseholdId == household.HouseholdId);
        if (item is null) return NotFound();

        item.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ShoppingChanged);
        return NoContent();
    }
}
