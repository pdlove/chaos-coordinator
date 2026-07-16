namespace ChaosCoordinator.Api.Services;

/// <summary>Registered when TURNSTILE_SECRET_KEY isn't configured — always passes, so local dev
/// and deployments without Cloudflare credentials aren't blocked from logging in or registering.</summary>
public class NoopTurnstileVerifier : ITurnstileVerifier
{
    public Task<bool> VerifyAsync(string? token) => Task.FromResult(true);
}
