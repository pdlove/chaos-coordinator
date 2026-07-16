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

    /// <summary>BCrypt hash. Only ever set for Role == Adult (PIN-elevation-eligible).</summary>
    public string? PinHash { get; set; }

    /// <summary>Login identity for the web/app (email+password) flow. Null for Child accounts
    /// that only ever authenticate via a paired wall display + PIN.</summary>
    public string? Email { get; set; }

    /// <summary>BCrypt hash of the web/app login password. Null until the account is activated
    /// (registrant sets it at signup; invited Adult/Other members set it via their invite link).</summary>
    public string? PasswordHash { get; set; }

    public DateTime? EmailVerifiedAt { get; set; }

    /// <summary>Display order in the avatar rail / profile switcher.</summary>
    public int Order { get; set; }

    public ICollection<DietaryTag> DietaryTags { get; set; } = new List<DietaryTag>();
}
