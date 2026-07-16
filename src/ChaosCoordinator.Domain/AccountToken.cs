namespace ChaosCoordinator.Domain;

/// <summary>Single-use token for email verification (first adult, at registration) and invites
/// (additional Adult/Other members, at registration). The raw token is only ever emailed to the
/// user — only its hash is stored, so a DB read alone can't be used to claim it.</summary>
public class AccountToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string TokenHash { get; set; } = "";
    public AccountTokenPurpose Purpose { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
