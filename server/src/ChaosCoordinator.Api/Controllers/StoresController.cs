using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/stores")]
public class StoresController(AppDbContext db, HouseholdContext household, IHouseholdNotifier notifier) : ControllerBase
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
        var items = await db.ShoppingListItems
            .Where(i => i.StoreId == storeId && i.Store!.HouseholdId == household.HouseholdId)
            .OrderBy(i => i.Department).ThenBy(i => i.CreatedAt)
            .Select(i => new ShoppingItemDto(i.Id, i.StoreId, i.Name, i.Department, i.Note, i.Quantity, i.Checked, i.LastPaidPrice))
            .ToListAsync();
        return Ok(items);
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
}
