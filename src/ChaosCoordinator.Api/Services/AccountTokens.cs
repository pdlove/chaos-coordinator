using System.Security.Cryptography;
using System.Text;

namespace ChaosCoordinator.Api.Services;

/// <summary>Shared helpers for single-use, hashed account tokens (email verification / invite
/// links) — never store the raw token, only its SHA-256 hash, so a DB read alone can't be used to
/// forge a link. Used by AuthController (registration/invite flows) and UsersController (sending
/// a password-setup email to an existing user from People &amp; roles).</summary>
public static class AccountTokens
{
    public static string Hash(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));

    public static (string RawToken, string TokenHash) Generate()
    {
        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
        return (raw, Hash(raw));
    }

    public static bool IsValidEmail(string email)
    {
        try { return new System.Net.Mail.MailAddress(email).Address == email; }
        catch { return false; }
    }
}
