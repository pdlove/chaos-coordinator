namespace ChaosCoordinator.Domain;

public class User
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Household? Household { get; set; }

    public string Name { get; set; } = "";
    public string Initials { get; set; } = "";
    public string Color { get; set; } = "";
    public Role Role { get; set; }

    /// <summary>BCrypt hash. Only ever set for Role == Parent.</summary>
    public string? PinHash { get; set; }

    /// <summary>Display order in the avatar rail / profile switcher.</summary>
    public int Order { get; set; }

    public ICollection<DietaryTag> DietaryTags { get; set; } = new List<DietaryTag>();
}
