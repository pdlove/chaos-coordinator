namespace ChaosCoordinator.Api.Dtos;

public record StoreDto(Guid Id, string Name, int Order, bool HideCheckedItemsEnabled);

public record ShoppingItemDto(
    Guid Id,
    Guid StoreId,
    string Name,
    string Department,
    string? Note,
    int Quantity,
    bool Checked,
    decimal? LastPaidPrice
);

public record PriceHistoryEntryDto(DateTime PaidAt, decimal Price);

/// <summary>An autocomplete suggestion drawn from existing item rows (checked or not) across
/// every store in the household — items persist indefinitely rather than being cleared per
/// shopping trip, so "purchase history" is just the existing rows, not a separate catalog.</summary>
public record ItemSuggestionDto(string Name, string Department, int TimesBought, decimal? LastPrice);

public record CreateStoreRequest(string Name);

public record UpdateStoreSettingsRequest(bool HideCheckedItemsEnabled);

public record CreateItemRequest(string Name, string Department, string? Note, int Quantity);

public record UpdateItemRequest(string Name, string Department, string? Note, int Quantity, bool Checked);

public record PayItemRequest(decimal Price);
