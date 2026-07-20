using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace ChaosCoordinator.Api.Services;

/// <summary>Organizes a shopping list into a likely store-walking order using the local Ollama
/// model — same raw-HTTP approach and OllamaOptions as OllamaEventExtractionService, reused here
/// since this is a plain text task (no image) any of the already-configured chat models handle
/// fine.</summary>
public class OllamaShoppingListOrganizerService(HttpClient http, IOptions<OllamaOptions> options, ILogger<OllamaShoppingListOrganizerService> logger)
    : IShoppingListOrganizerService
{
    public async Task<List<OrganizedCategory>> OrganizeAsync(IReadOnlyList<ShoppingItemToOrganize> items, CancellationToken ct)
    {
        var prompt = ShoppingOrganizePrompt.Build(items);
        if (options.Value.LogPrompts)
        {
            logger.LogInformation("Ollama organize prompt (model={Model}, items={ItemCount}):\n{Prompt}", options.Value.VisionModel, items.Count, prompt);
        }

        var requestBody = new
        {
            model = options.Value.VisionModel,
            messages = new[] { new { role = "user", content = prompt } },
            format = ShoppingOrganizeSchema.Node,
            stream = false,
        };

        HttpResponseMessage response;
        try
        {
            response = await http.PostAsJsonAsync("/api/chat", requestBody, ct);
        }
        catch (HttpRequestException ex)
        {
            throw new ShoppingOrganizeUnavailableException(
                $"Couldn't reach Ollama at {http.BaseAddress} — is it running?", ex);
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Ollama chat request failed ({Status}): {Body}", response.StatusCode, body);
            throw new ShoppingOrganizeUnavailableException($"Ollama returned {response.StatusCode}");
        }

        var chatResponse = await response.Content.ReadFromJsonAsync<OllamaChatResponse>(cancellationToken: ct);
        var content = chatResponse?.Message?.Content;
        if (options.Value.LogPrompts)
        {
            logger.LogInformation("Ollama organize response:\n{Content}", content);
        }

        return ShoppingOrganizeParser.Parse(content, items.Select(i => i.Id).ToList(), logger);
    }

    private record OllamaChatResponse([property: JsonPropertyName("message")] OllamaMessage? Message);
    private record OllamaMessage([property: JsonPropertyName("content")] string? Content);
}
