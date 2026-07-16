using ChaosCoordinator.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace ChaosCoordinator.Api.Realtime;

public interface IHouseholdNotifier
{
    Task NotifyAsync(Guid householdId, string eventName);
}

/// <summary>Thin wrapper controllers call after committing a mutation, so they never touch
/// IHubContext directly. Payloads are intentionally empty — clients just refetch on receipt.</summary>
public class HouseholdNotifier(IHubContext<HouseholdHub> hub) : IHouseholdNotifier
{
    public Task NotifyAsync(Guid householdId, string eventName) =>
        hub.Clients.Group(HouseholdHub.GroupName(householdId.ToString())).SendAsync("event", eventName);
}
