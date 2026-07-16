using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Services;
using ChaosCoordinator.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ChaosCoordinator.Api.Controllers;

/// <summary>Web Push subscription management. Deliberately doesn't depend on HouseholdContext —
/// subscriptions are per-user, not per-household, and the public key needs to be readable before
/// any session exists.</summary>
[ApiController]
[Route("api/push")]
public class PushController(AppDbContext db, ICurrentUserAccessor currentUser, IOptions<VapidOptions> vapidOptions) : ControllerBase
{
    [HttpGet("vapid-public-key")]
    public ActionResult<VapidPublicKeyDto> GetVapidPublicKey() =>
        Ok(new VapidPublicKeyDto(vapidOptions.Value.PublicKey));

    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe(SubscribeToPushRequest request)
    {
        if (currentUser.UserId is not { } userId) return Unauthorized();

        var existing = await db.PushSubscriptions.FirstOrDefaultAsync(s => s.Endpoint == request.Endpoint);
        if (existing is not null)
        {
            existing.UserId = userId;
            existing.P256dh = request.P256dh;
            existing.Auth = request.Auth;
        }
        else
        {
            db.PushSubscriptions.Add(new Domain.PushSubscription
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Endpoint = request.Endpoint,
                P256dh = request.P256dh,
                Auth = request.Auth,
                CreatedAt = DateTime.UtcNow,
            });
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("unsubscribe")]
    public async Task<IActionResult> Unsubscribe(UnsubscribeFromPushRequest request)
    {
        var existing = await db.PushSubscriptions.FirstOrDefaultAsync(s => s.Endpoint == request.Endpoint);
        if (existing is not null)
        {
            db.PushSubscriptions.Remove(existing);
            await db.SaveChangesAsync();
        }

        return NoContent();
    }
}
