using ChaosCoordinator.Data;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Services;

/// <summary>Entry point controllers and ReminderCheckService use to actually notify a user (or
/// several) — resolves their PushSubscriptions, sends to each via IPushSender, and prunes any
/// that come back expired.</summary>
public class PushNotificationService(AppDbContext db, IPushSender sender)
{
    public async Task NotifyUserAsync(Guid userId, PushPayload payload)
    {
        var subscriptions = await db.PushSubscriptions.Where(s => s.UserId == userId).ToListAsync();
        await SendToAllAsync(subscriptions, payload);
    }

    public async Task NotifyUsersAsync(IEnumerable<Guid> userIds, PushPayload payload)
    {
        var ids = userIds.ToList();
        var subscriptions = await db.PushSubscriptions.Where(s => ids.Contains(s.UserId)).ToListAsync();
        await SendToAllAsync(subscriptions, payload);
    }

    private async Task SendToAllAsync(List<Domain.PushSubscription> subscriptions, PushPayload payload)
    {
        var expired = new List<Domain.PushSubscription>();
        foreach (var subscription in subscriptions)
        {
            var result = await sender.SendAsync(subscription, payload);
            if (result == PushSendResult.Expired) expired.Add(subscription);
        }

        if (expired.Count > 0)
        {
            db.PushSubscriptions.RemoveRange(expired);
            await db.SaveChangesAsync();
        }
    }
}
