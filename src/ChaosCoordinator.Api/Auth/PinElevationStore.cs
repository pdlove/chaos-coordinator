using Microsoft.Extensions.Caching.Memory;

namespace ChaosCoordinator.Api.Auth;

/// <summary>
/// Tracks "elevated" status per browser session, not per user identity — keyed by the ASP.NET
/// Core session id, which every request already carries via the session cookie. Two sources set
/// this, with different durations: a wall-display session verifying an Adult's PIN (short-lived —
/// the wall is a shared kiosk, so elevation shouldn't outlive "someone standing at it right now"),
/// or an Adult logging into their own account on the phone/web app (session-long — see
/// AuthController.EstablishSession). Entirely server-side, so "exit edit mode" revokes it
/// instantly instead of waiting for a token to expire.
/// </summary>
public interface IPinElevationStore
{
    void Elevate(string sessionId, TimeSpan duration);
    bool IsElevated(string sessionId);
    void Clear(string sessionId);
}

public class PinElevationStore(IMemoryCache cache) : IPinElevationStore
{
    private static string Key(string sessionId) => $"pin-elevated:{sessionId}";

    public void Elevate(string sessionId, TimeSpan duration) =>
        cache.Set(Key(sessionId), true, duration);

    public bool IsElevated(string sessionId) =>
        cache.TryGetValue(Key(sessionId), out _);

    public void Clear(string sessionId) =>
        cache.Remove(Key(sessionId));
}
