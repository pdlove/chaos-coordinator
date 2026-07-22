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
[Route("api/stores")]
public class StoresController(
    AppDbContext db,
    HouseholdContext household,
    IHouseholdNotifier notifier,
    IShoppingListOrganizerService organizer,
    ILogger<StoresController> logger
) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<StoreDto>>> Get()
    {
        var stores = await db.Stores
            .Where(s => s.HouseholdId == household.HouseholdId)
            .OrderBy(s => s.Order)
            .Select(s => new StoreDto(s.Id, s.Name, s.Order))
            .ToListAsync();
        return Ok(stores);
    }

    [HttpPost]
    [RequirePinElevation]
    public async Task<IActionResult> Create(CreateStoreRequest request)
    {
        var order = await db.Stores.CountAsync(s => s.HouseholdId == household.HouseholdId);
        var store = new Store { Id = Guid.NewGuid(), HouseholdId = household.HouseholdId, Name = request.Name, Order = order };
        db.Stores.Add(store);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ShoppingChanged);
        return Ok(new StoreDto(store.Id, store.Name, store.Order));
    }

    [HttpGet("{storeId:guid}/items")]
    public async Task<ActionResult<List<ShoppingItemDto>>> GetItems(Guid storeId)
    {
        // Order = 0 means "never organized" (the default for every item) — those fall back to
        // alphabetical-by-department, then creation order. Once "Organize list" runs, Order
        // carries the AI-determined walking sequence (headers included) and takes precedence.
        var items = await db.ShoppingListItems
            .Where(i => i.StoreId == storeId && i.Store!.HouseholdId == household.HouseholdId && i.DeletedAt == null)
            // Checked items are hidden (never deleted — see ItemSuggestionDto) once
            // Store.CheckedItemsHiddenBefore has been stamped past their CheckedAt by "Remove
            // checked items"; anything checked off since stays visible.
            .Where(i => !i.Checked || i.CheckedAt == null
                || i.Store!.CheckedItemsHiddenBefore == null || i.CheckedAt > i.Store!.CheckedItemsHiddenBefore)
            .OrderBy(i => i.Order).ThenBy(i => i.Department).ThenBy(i => i.CreatedAt)
            .Select(i => new ShoppingItemDto(i.Id, i.StoreId, i.Name, i.Department, i.Note, i.Quantity, i.Checked, i.LastPaidPrice))
            .ToListAsync();
        return Ok(items);
    }

    /// <summary>"Remove checked items" — hides (doesn't delete) every item checked off at or
    /// before this moment by stamping Store.CheckedItemsHiddenBefore, which GetItems then filters
    /// against. Anything checked off afterward stays visible until this is pressed again.</summary>
    [HttpPost("{storeId:guid}/hide-checked-items")]
    public async Task<IActionResult> HideCheckedItems(Guid storeId)
    {
        var store = await db.Stores.FirstOrDefaultAsync(s => s.Id == storeId && s.HouseholdId == household.HouseholdId);
        if (store is null) return NotFound();

        store.CheckedItemsHiddenBefore = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ShoppingChanged);
        return NoContent();
    }

    /// <summary>"Delete checked items" — soft-deletes (see ShoppingListItem.DeletedAt) every
    /// currently-checked, not-yet-deleted item in one shot. Unlike "Remove checked items" above,
    /// this doesn't leave the rows sitting there filtered by a timestamp; it marks them gone the
    /// same way a single swipe-delete does, just for all of them at once.</summary>
    [HttpPost("{storeId:guid}/delete-checked-items")]
    public async Task<IActionResult> DeleteCheckedItems(Guid storeId)
    {
        var store = await db.Stores.FirstOrDefaultAsync(s => s.Id == storeId && s.HouseholdId == household.HouseholdId);
        if (store is null) return NotFound();

        var checkedItems = await db.ShoppingListItems
            .Where(i => i.StoreId == storeId && i.Checked && i.DeletedAt == null)
            .ToListAsync();
        var now = DateTime.UtcNow;
        foreach (var item in checkedItems) item.DeletedAt = now;

        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ShoppingChanged);
        return NoContent();
    }

    [HttpPost("{storeId:guid}/items")]
    public async Task<IActionResult> CreateItem(Guid storeId, CreateItemRequest request)
    {
        var store = await db.Stores.FirstOrDefaultAsync(s => s.Id == storeId && s.HouseholdId == household.HouseholdId);
        if (store is null) return NotFound();

        var item = new ShoppingListItem
        {
            Id = Guid.NewGuid(),
            StoreId = storeId,
            Name = request.Name,
            Department = request.Department,
            Note = request.Note,
            Quantity = request.Quantity <= 0 ? 1 : request.Quantity,
            CreatedAt = DateTime.UtcNow,
        };
        db.ShoppingListItems.Add(item);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ShoppingChanged);
        return Ok(new ShoppingItemDto(item.Id, item.StoreId, item.Name, item.Department, item.Note, item.Quantity, item.Checked, item.LastPaidPrice));
    }

    /// <summary>Groups every real (non-header) item in this store's list into AI-defined
    /// categories and inserts a real header row per category (see
    /// ShoppingListItem.IsCategoryHeader) — the same "ALL CAPS = section divider" the user gets
    /// by typing one manually, so the AI's grouping is visible and editable the same way rather
    /// than living in a hidden per-item field. Re-running this deletes headers from the previous
    /// run first, so they never accumulate; user-typed headers are untouched since they don't
    /// carry IsCategoryHeader. Uses IShoppingListOrganizerService (Claude or local Ollama,
    /// whichever is configured — see Program.cs).</summary>
    [HttpPost("{storeId:guid}/organize")]
    public async Task<ActionResult<List<ShoppingItemDto>>> Organize(Guid storeId, CancellationToken ct)
    {
        var store = await db.Stores.FirstOrDefaultAsync(s => s.Id == storeId && s.HouseholdId == household.HouseholdId, ct);
        if (store is null) return NotFound();

        var allItems = await db.ShoppingListItems.Where(i => i.StoreId == storeId && i.DeletedAt == null).ToListAsync(ct);
        db.ShoppingListItems.RemoveRange(allItems.Where(i => i.IsCategoryHeader));
        var items = allItems.Where(i => !i.IsCategoryHeader).ToList();
        if (items.Count == 0)
        {
            await db.SaveChangesAsync(ct);
            return Ok(new List<ShoppingItemDto>());
        }

        List<OrganizedCategory> categories;
        try
        {
            categories = await organizer.OrganizeAsync(
                items.Select(i => new ShoppingItemToOrganize(i.Id, i.Name, i.Department)).ToList(), ct);
        }
        catch (ShoppingOrganizeUnavailableException ex)
        {
            logger.LogError(ex, "Shopping list organize unavailable");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "organize_not_configured" });
        }

        var byId = items.ToDictionary(i => i.Id);
        var placed = new HashSet<Guid>();
        var order = 0;
        foreach (var category in categories)
        {
            var categoryItems = category.ItemIds.Where(id => byId.ContainsKey(id) && placed.Add(id)).Select(id => byId[id]).ToList();
            if (categoryItems.Count == 0) continue;

            db.ShoppingListItems.Add(new ShoppingListItem
            {
                Id = Guid.NewGuid(),
                StoreId = storeId,
                Name = category.Name.ToUpperInvariant(),
                Department = category.Name,
                IsCategoryHeader = true,
                Quantity = 1,
                CreatedAt = DateTime.UtcNow,
                Order = order++,
            });

            foreach (var item in categoryItems)
            {
                item.Department = category.Name;
                item.Order = order++;
            }
        }

        // Anything the model didn't place anywhere (empty response, a dropped id, etc.) is kept,
        // not lost — just appended after everything the AI did organize.
        foreach (var leftover in items.Where(i => !placed.Contains(i.Id)))
        {
            leftover.Order = order++;
        }

        await db.SaveChangesAsync(ct);
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.ShoppingChanged);

        var updated = await db.ShoppingListItems
            .Where(i => i.StoreId == storeId && i.DeletedAt == null)
            .OrderBy(i => i.Order).ThenBy(i => i.Department).ThenBy(i => i.CreatedAt)
            .Select(i => new ShoppingItemDto(i.Id, i.StoreId, i.Name, i.Department, i.Note, i.Quantity, i.Checked, i.LastPaidPrice))
            .ToListAsync(ct);
        return Ok(updated);
    }
}
