namespace ChaosCoordinator.Api.Services;

/// <summary>Populated in Program.cs from VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT. Mirrors
/// TurnstileOptions' configured/fallback shape — without a key pair, push sends are logged instead
/// of delivered so the rest of the app still works end-to-end in local dev.</summary>
public class VapidOptions
{
    public string? PublicKey { get; set; }
    public string? PrivateKey { get; set; }
    public string? Subject { get; set; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(PublicKey) && !string.IsNullOrWhiteSpace(PrivateKey) && !string.IsNullOrWhiteSpace(Subject);
}
