using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using WebPush;

namespace ChaosCoordinator.Api.Services;

/// <summary>Sends real Web Push messages via VAPID. Registered instead of NoopPushSender once
/// VapidOptions.IsConfigured — see Program.cs.</summary>
public class WebPushSender(IOptions<VapidOptions> options, ILogger<WebPushSender> logger) : IPushSender
{
    private readonly VapidDetails _vapidDetails = new(options.Value.Subject, options.Value.PublicKey, options.Value.PrivateKey);
    private readonly WebPushClient _client = new();

    public async Task<PushSendResult> SendAsync(Domain.PushSubscription subscription, PushPayload payload)
    {
        var webPushSubscription = new WebPush.PushSubscription(subscription.Endpoint, subscription.P256dh, subscription.Auth);
        var json = JsonSerializer.Serialize(payload);

        try
        {
            await _client.SendNotificationAsync(webPushSubscription, json, _vapidDetails);
            return PushSendResult.Sent;
        }
        catch (WebPushException ex) when (ex.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
        {
            // The browser/OS push service says this subscription no longer exists — the caller
            // prunes it rather than retrying forever.
            return PushSendResult.Expired;
        }
        catch (WebPushException ex)
        {
            logger.LogWarning(ex, "Web Push send failed with {StatusCode}", ex.StatusCode);
            return PushSendResult.Failed;
        }
    }
}
