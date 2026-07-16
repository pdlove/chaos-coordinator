namespace ChaosCoordinator.Api.Services;

/// <summary>Registered when VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT aren't configured —
/// logs instead of sending, so local dev and deployments without VAPID credentials aren't blocked.</summary>
public class NoopPushSender(ILogger<NoopPushSender> logger) : IPushSender
{
    public Task<PushSendResult> SendAsync(Domain.PushSubscription subscription, PushPayload payload)
    {
        logger.LogInformation("[push:not-sent] {Title}: {Body}", payload.Title, payload.Body);
        return Task.FromResult(PushSendResult.Sent);
    }
}
