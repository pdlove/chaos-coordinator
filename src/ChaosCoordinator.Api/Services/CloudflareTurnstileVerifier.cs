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
        if (string.IsNullOrWhiteSpace(token)) return false;

        try
        {
            var response = await http.PostAsync(VerifyUrl, new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["secret"] = options.Value.SecretKey!,
                ["response"] = token,
            }));
            var result = await response.Content.ReadFromJsonAsync<SiteverifyResponse>();
            return result?.Success ?? false;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Turnstile siteverify request failed");
            return false;
        }
    }

    private record SiteverifyResponse([property: JsonPropertyName("success")] bool Success);
}
