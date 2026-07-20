using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace ChaosCoordinator.Api.Services;

/// <summary>Reads calendar events out of photos/pasted text using the Claude API (Messages
/// endpoint, raw HTTP — no Anthropic SDK dependency, matching this project's existing style for
/// external HTTP integrations; see CloudflareTurnstileVerifier). Registered instead of
/// OllamaEventExtractionService when ANTHROPIC_API_KEY is configured — see Program.cs. Uses
/// structured outputs (output_config.format) for the same reliability reason as Ollama's
/// "format" field: a forced JSON shape regardless of how the model reasons about the image.</summary>
public class ClaudeEventExtractionService(HttpClient http, IOptions<AnthropicOptions> options, ILogger<ClaudeEventExtractionService> logger)
    : IEventExtractionService
{
    public async Task<List<ExtractedEventFields>> ExtractAsync(
        IReadOnlyList<byte[]> images, string? pastedText, CancellationToken ct)
    {
        var prompt = EventExtractionPrompt.Build(pastedText, images.Count);
        if (options.Value.LogPrompts)
        {
            logger.LogInformation(
                "Claude prompt (model={Model}, images={ImageCount}):\n{Prompt}", options.Value.Model, images.Count, prompt);
        }

        var contentBlocks = new List<object>();
        foreach (var image in images)
        {
            contentBlocks.Add(new
            {
                type = "image",
                source = new { type = "base64", media_type = SniffMediaType(image), data = Convert.ToBase64String(image) },
            });
        }
        contentBlocks.Add(new { type = "text", text = prompt });

        var requestBody = new
        {
            model = options.Value.Model,
            // A dense multi-day itinerary can easily run 40-50+ events — 2048 was cutting Claude
            // off mid-JSON-string on real documents. 8192 covers that comfortably at negligible
            // extra cost (Haiku 4.5 output is $5/MTok, so the ceiling itself costs ~$0.04 even if
            // fully used).
            max_tokens = 8192,
            messages = new[] { new { role = "user", content = contentBlocks } },
            output_config = new { format = new { type = "json_schema", schema = EventExtractionSchema.Node } },
        };

        HttpResponseMessage response;
        try
        {
            response = await http.PostAsJsonAsync("/v1/messages", requestBody, ct);
        }
        catch (HttpRequestException ex)
        {
            throw new EventExtractionUnavailableException(
                $"Couldn't reach the Claude API at {http.BaseAddress} — check network connectivity.", ex);
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Claude API request failed ({Status}): {Body}", response.StatusCode, body);
            throw new EventExtractionUnavailableException($"Claude API returned {response.StatusCode}");
        }

        var message = await response.Content.ReadFromJsonAsync<ClaudeMessageResponse>(cancellationToken: ct);
        if (message?.StopReason == "refusal")
        {
            logger.LogWarning("Claude declined the extraction request (stop_reason=refusal)");
            return [];
        }
        if (message?.StopReason == "max_tokens")
        {
            // The JSON is necessarily incomplete at this point (cut off mid-array or mid-string)
            // — log this distinctly from a generic parse failure so it's obvious at a glance that
            // raising max_tokens further (not a prompt/schema bug) is the fix.
            logger.LogWarning("Claude's response was truncated by max_tokens — the source likely has more events than fit; consider raising max_tokens further");
        }

        var content = message?.Content?.FirstOrDefault(b => b.Type == "text")?.Text;
        if (options.Value.LogPrompts)
        {
            logger.LogInformation("Claude response:\n{Content}", content);
        }

        return EventExtractionParser.Parse(content, logger);
    }

    // Claude's Messages API requires an explicit media_type per image (unlike Ollama, which
    // auto-detects) — sniffed from magic bytes since ExtractAsync only receives raw bytes, not
    // the original filename/extension, and that's fine: no other IEventExtractionService backend
    // needs this, so it isn't worth threading through the shared interface.
    private static string SniffMediaType(byte[] bytes)
    {
        if (bytes.Length >= 4 && bytes[0] == 0xFF && bytes[1] == 0xD8) return "image/jpeg";
        if (bytes.Length >= 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) return "image/png";
        if (bytes.Length >= 12 && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46) return "image/webp";
        if (bytes.Length >= 4 && bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46) return "image/gif";
        return "image/jpeg";
    }

    private record ClaudeMessageResponse(
        [property: JsonPropertyName("content")] List<ClaudeContentBlock>? Content,
        [property: JsonPropertyName("stop_reason")] string? StopReason
    );
    private record ClaudeContentBlock(
        [property: JsonPropertyName("type")] string Type,
        [property: JsonPropertyName("text")] string? Text
    );
}
