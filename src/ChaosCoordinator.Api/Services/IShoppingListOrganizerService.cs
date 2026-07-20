namespace ChaosCoordinator.Api.Services;

/// <summary>One item as sent to the organizer — enough for the model to place it, no need for
/// price/quantity/checked state.</summary>
public record ShoppingItemToOrganize(Guid Id, string Name, string Department);

/// <summary>One category the organizer defined, with the ids of the items it placed there, in
/// the order they should appear. Categories themselves are returned in walking-route order.
/// StoresController.Organize turns each of these into a real header row (see
/// ShoppingListItem.IsCategoryHeader) — the same "ALL CAPS = section divider" mechanism a user
/// gets by typing one manually — rather than a hidden per-item field, so the AI's grouping is
/// visible and editable the same way.</summary>
public record OrganizedCategory(string Name, List<Guid> ItemIds);

public class ShoppingOrganizeUnavailableException(string message, Exception? inner = null) : Exception(message, inner);

public interface IShoppingListOrganizerService
{
    Task<List<OrganizedCategory>> OrganizeAsync(IReadOnlyList<ShoppingItemToOrganize> items, CancellationToken ct);
}
