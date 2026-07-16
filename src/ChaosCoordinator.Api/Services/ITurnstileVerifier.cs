namespace ChaosCoordinator.Api.Services;

/// <summary>Verifies a Cloudflare Turnstile challenge token submitted with login/registration.
/// NoopTurnstileVerifier is registered instead of CloudflareTurnstileVerifier until
/// TURNSTILE_SECRET_KEY is set — see Program.cs.</summary>
public interface ITurnstileVerifier
{
    Task<bool> VerifyAsync(string? token);
}
