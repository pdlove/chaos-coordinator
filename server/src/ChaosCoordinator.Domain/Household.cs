namespace ChaosCoordinator.Domain;

public class Household
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public DateTime CreatedAt { get; set; }

    /// <summary>CSV of up to 4 section keys shown in the bottom nav (e.g. "calendar,chores,shopping,bills")
    /// — "more" is always a fixed 5th tab, not stored here. See More/settings' "Customize bottom bar."</summary>
    public string BottomBarTabs { get; set; } = "calendar,chores,shopping,bills";

    public ICollection<User> Users { get; set; } = new List<User>();
}
