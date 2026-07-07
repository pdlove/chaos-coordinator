namespace ChaosCoordinator.Api.Realtime;

/// <summary>SignalR message names. Mirrored by hand in web/packages/shared/src/realtimeEvents.ts —
/// these are just string method names, both sides only need to agree on the strings, not full schemas.</summary>
public static class RealtimeEvents
{
    public const string HouseholdChanged = "household:changed";
    public const string CalendarChanged = "calendar:changed";
    public const string ChoresChanged = "chores:changed";
    public const string TasksChanged = "tasks:changed";
    public const string ProjectsChanged = "projects:changed";
    public const string ShoppingChanged = "shopping:changed";
    public const string BillsChanged = "bills:changed";
    public const string FoodChanged = "food:changed";
}
