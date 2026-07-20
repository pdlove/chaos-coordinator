namespace ChaosCoordinator.Domain;

public class Store
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public string Name { get; set; } = "";
    public int Order { get; set; }

    public ICollection<ShoppingListItem> Items { get; set; } = new List<ShoppingListItem>();
}

public class ShoppingListItem
{
    public Guid Id { get; set; }
    public Guid StoreId { get; set; }
    public Store? Store { get; set; }

    public string Name { get; set; } = "";

    /// <summary>Free text, not an enum — department taxonomy varies by store/household.</summary>
    public string Department { get; set; } = "";

    public string? Note { get; set; }
    public int Quantity { get; set; } = 1;
    public bool Checked { get; set; }

    /// <summary>Position within the store's list, in walking order — 0 (the default for every
    /// item until "Organize list" has been run) means "not yet organized," in which case the
    /// list falls back to the previous Department/CreatedAt sort. Set by
    /// IShoppingListOrganizerService based on typical grocery-store layout.</summary>
    public int Order { get; set; }

    /// <summary>True for a category-header row inserted by "Organize list" (see
    /// StoresController.Organize) — internal only, never exposed on ShoppingItemDto. The frontend
    /// renders it as a section divider the same way it renders a user-typed ALL-CAPS name (see
    /// isGroupHeader), but this flag is what lets a subsequent Organize run safely delete and
    /// regenerate its own header rows without also deleting a header the user typed by hand.</summary>
    public bool IsCategoryHeader { get; set; }

    /// <summary>Denormalized for fast list rendering; source of truth is PriceHistoryEntry.</summary>
    public decimal? LastPaidPrice { get; set; }

    public DateTime CreatedAt { get; set; }

    public ICollection<PriceHistoryEntry> PriceHistory { get; set; } = new List<PriceHistoryEntry>();
}

public class PriceHistoryEntry
{
    public Guid Id { get; set; }
    public Guid ItemId { get; set; }
    public ShoppingListItem? Item { get; set; }

    public decimal Price { get; set; }
    public DateTime PaidAt { get; set; }
}
