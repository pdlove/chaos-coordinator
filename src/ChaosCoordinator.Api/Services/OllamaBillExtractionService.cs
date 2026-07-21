using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace ChaosCoordinator.Api.Services;

/// <summary>Reads a bill's payee/amount/due-date out of photos using a locally-hosted Ollama
/// vision model — same OllamaOptions/model as OllamaEventExtractionService, structured output via
/// Ollama's "format" field.</summary>
public class OllamaBillExtractionService(HttpClient http, IOptions<OllamaOptions> options, ILogger<OllamaBillExtractionService> logger)
    : IBillExtractionService
{
    public async Task<ExtractedBillFields> ExtractAsync(IReadOnlyList<byte[]> images, CancellationToken ct)
    {
        var prompt = BillExtractionPrompt.Build(images.Count);
        if (options.Value.LogPrompts)
        {
            logger.LogInformation(
                "Ollama bill prompt (model={Model}, images={ImageCount}):\n{Prompt}", options.Value.VisionModel, images.Count, prompt);
        }

        var userMessage = new Dictionary<string, object?>
        {
            ["role"] = "user",
            ["content"] = prompt,
            ["images"] = images.Select(Convert.ToBase64String).ToList(),
        };

        var requestBody = new
        {
            model = options.Value.VisionModel,
            messages = new[] { userMessage },
            format = BillExtractionSchema.Node,
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
            logger.LogInformation("Ollama bill response:\n{Content}", content);
        }

        return BillExtractionParser.Parse(content, logger);
    }

    private record OllamaChatResponse([property: JsonPropertyName("message")] OllamaMessage? Message);
    private record OllamaMessage([property: JsonPropertyName("content")] string? Content);
}
