namespace ChaosCoordinator.Domain;

public class Recipe
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public string Title { get; set; } = "";
    public int PrepMinutes { get; set; }
    public int CookMinutes { get; set; }
    public string? Instructions { get; set; }

    public ICollection<MenuEntry> MenuEntries { get; set; } = new List<MenuEntry>();
}

public class MenuEntry
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public DateOnly Date { get; set; }
    public MealType MealType { get; set; }

    /// <summary>Default dish name — denormalized even when RecipeId is set, for quick display and non-recipe meals.</summary>
    public string Dish { get; set; } = "";

    public Guid? RecipeId { get; set; }
    public Recipe? Recipe { get; set; }

    public ICollection<MenuEater> Eaters { get; set; } = new List<MenuEater>();
    public ICollection<Substitution> Substitutions { get; set; } = new List<Substitution>();
}

/// <summary>Join table: the default eaters of a menu entry.</summary>
public class MenuEater
{
    public Guid MenuEntryId { get; set; }
    public MenuEntry? MenuEntry { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }
}

/// <summary>A per-meal, per-person dish override (e.g. "GF wrap" instead of "Turkey sandwiches" for Carmen).</summary>
public class Substitution
{
    public Guid Id { get; set; }
    public Guid MenuEntryId { get; set; }
    public MenuEntry? MenuEntry { get; set; }

    public Guid ForUserId { get; set; }
    public User? ForUser { get; set; }

    public string Dish { get; set; } = "";

    /// <summary>Free text label shown on the swap, e.g. "gluten-free" — usually copied from a DietaryTag suggestion.</summary>
    public string DietaryLabel { get; set; } = "";
}

/// <summary>A standing per-person dietary restriction (e.g. Carmen = gluten-free) that auto-suggests Substitutions.</summary>
public class DietaryTag
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string Tag { get; set; } = "";
}
