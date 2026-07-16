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
