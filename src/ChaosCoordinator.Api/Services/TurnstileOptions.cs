namespace ChaosCoordinator.Api.Services;

/// <summary>Populated in Program.cs from TURNSTILE_SECRET_KEY. Mirrors GraphEmailOptions'
/// configured/fallback shape — without a secret key, verification is skipped entirely so login
/// and registration still work end-to-end in local dev.</summary>
public class TurnstileOptions
{
    public string? SecretKey { get; set; }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(SecretKey);
}
