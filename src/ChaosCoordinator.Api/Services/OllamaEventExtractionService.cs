using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace ChaosCoordinator.Api.Services;

/// <summary>Reads calendar events out of photos/pasted text using a locally-hosted Ollama vision
/// model (see OllamaOptions — default "moondream", swap to "llava" for better accuracy at higher
/// VRAM cost). Uses Ollama's structured-output "format" (a JSON Schema) to force a syntactically
/// valid JSON response regardless of how well the underlying model actually reasons about the
/// image — this is what keeps parsing reliable even on a small 1.6B model.</summary>
public class OllamaEventExtractionService(HttpClient http, IOptions<OllamaOptions> options, ILogger<OllamaEventExtractionService> logger)
    : IEventExtractionService
{
    public async Task<List<ExtractedEventFields>> ExtractAsync(
        IReadOnlyList<byte[]> images, string? pastedText, CancellationToken ct)
    {
        var prompt = EventExtractionPrompt.Build(pastedText, images.Count);
        if (options.Value.LogPrompts)
        {
            logger.LogInformation(
                "Ollama prompt (model={Model}, images={ImageCount}):\n{Prompt}", options.Value.VisionModel, images.Count, prompt);
        }

        var userMessage = new Dictionary<string, object?>
        {
            ["role"] = "user",
            ["content"] = prompt,
        };
        if (images.Count > 0)
        {
            userMessage["images"] = images.Select(Convert.ToBase64String).ToList();
        }

        var requestBody = new
        {
            model = options.Value.VisionModel,
            messages = new[] { userMessage },
            format = EventExtractionSchema.Node,
            stream = false,
        };

        HttpResponseMessage response;
        try
        {
            response = await http.PostAsJsonAsync("/api/chat", requestBody, ct);
        }
        catch (HttpRequestException ex)
        {
            throw new EventExtractionUnavailableException(
                $"Couldn't reach Ollama at {http.BaseAddress} — is it running?", ex);
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Ollama chat request failed ({Status}): {Body}", response.StatusCode, body);
            throw new EventExtractionUnavailableException($"Ollama returned {response.StatusCode}");
        }

        var chatResponse = await response.Content.ReadFromJsonAsync<OllamaChatResponse>(cancellationToken: ct);
        var content = chatResponse?.Message?.Content;
        if (options.Value.LogPrompts)
        {
            logger.LogInformation("Ollama response:\n{Content}", content);
        }

        return EventExtractionParser.Parse(content, logger);
    }

    private record OllamaChatResponse([property: JsonPropertyName("message")] OllamaMessage? Message);
    private record OllamaMessage([property: JsonPropertyName("content")] string? Content);
}
