using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace ChaosCoordinator.Api.Services;

/// <summary>Verifies a Turnstile token against Cloudflare's siteverify endpoint. Registered
/// instead of NoopTurnstileVerifier once TurnstileOptions.IsConfigured — see Program.cs.</summary>
public class CloudflareTurnstileVerifier(HttpClient http, IOptions<TurnstileOptions> options, ILogger<CloudflareTurnstileVerifier> logger)
    : ITurnstileVerifier
{
    private const string VerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    public async Task<bool> VerifyAsync(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            logger.LogWarning("Turnstile verification skipped: no token was submitted (widget likely never completed client-side)");
            return false;
        }

        try
        {
            var response = await http.PostAsync(VerifyUrl, new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["secret"] = options.Value.SecretKey!,
                ["response"] = token,
            }));
            var result = await response.Content.ReadFromJsonAsync<SiteverifyResponse>();

            if (result?.Success is not true)
            {
                // Cloudflare returns HTTP 200 with success=false for e.g. a bad secret key, a
                // site/secret key pair mismatch, or an expired/already-used token — none of which
                // throw, so this is the only place that ever surfaces the real reason.
                var codes = result?.ErrorCodes is { Length: > 0 } ec ? string.Join(", ", ec) : "(none returned)";
                logger.LogWarning("Turnstile verification failed: {ErrorCodes}", codes);
            }

            return result?.Success ?? false;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Turnstile siteverify request threw (network/DNS issue reaching Cloudflare?)");
            return false;
        }
    }

    private record SiteverifyResponse(
        [property: JsonPropertyName("success")] bool Success,
        [property: JsonPropertyName("error-codes")] string[]? ErrorCodes
    );
}
