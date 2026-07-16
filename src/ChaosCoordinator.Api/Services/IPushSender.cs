namespace ChaosCoordinator.Api.Services;

public record PushPayload(string Title, string Body, string? Url = null);

public enum PushSendResult { Sent, Expired, Failed }

/// <summary>Sends one Web Push message to one subscription. NoopPushSender is registered instead
/// of WebPushSender until VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT are set — see
/// Program.cs.</summary>
public interface IPushSender
{
    Task<PushSendResult> SendAsync(Domain.PushSubscription subscription, PushPayload payload);
}
