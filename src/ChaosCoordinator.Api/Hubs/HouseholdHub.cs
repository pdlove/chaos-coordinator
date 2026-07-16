using Microsoft.AspNetCore.SignalR;

namespace ChaosCoordinator.Api.Hubs;

/// <summary>One SignalR group per household. Every phone client and the wall display join their
/// household's group on connect; mutating API calls broadcast a coarse "this changed" event to the
/// group afterwards (see IHouseholdNotifier) and clients refetch via React Query invalidation.</summary>
public class HouseholdHub : Hub
{
    public async Task JoinHousehold(string householdId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(householdId));
    }

    public static string GroupName(string householdId) => $"household:{householdId}";
}
