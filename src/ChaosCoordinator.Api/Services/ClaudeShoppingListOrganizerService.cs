using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace ChaosCoordinator.Api.Services;

/// <summary>Organizes a shopping list into a likely store-walking order using the Claude API —
/// same raw-HTTP approach and AnthropicOptions as ClaudeEventExtractionService, reused here
/// because this is also just a cheap single structured-output text call.</summary>
public class ClaudeShoppingListOrganizerService(HttpClient http, IOptions<AnthropicOptions> options, ILogger<ClaudeShoppingListOrganizerService> logger)
    : IShoppingListOrganizerService
{
    public async Task<List<OrganizedCategory>> OrganizeAsync(IReadOnlyList<ShoppingItemToOrganize> items, CancellationToken ct)
    {
        var prompt = ShoppingOrganizePrompt.Build(items);
        if (options.Value.LogPrompts)
        {
            logger.LogInformation("Claude organize prompt (model={Model}, items={ItemCount}):\n{Prompt}", options.Value.Model, items.Count, prompt);
        }

        var requestBody = new
        {
            model = options.Value.Model,
            max_tokens = 4096,
            messages = new[] { new { role = "user", content = prompt } },
            output_config = new { format = new { type = "json_schema", schema = ShoppingOrganizeSchema.Node } },
        };

        HttpResponseMessage response;
        try
        {
            response = await http.PostAsJsonAsync("/v1/messages", requestBody, ct);
        }
        catch (HttpRequestException ex)
        {
            throw new ShoppingOrganizeUnavailableException(
                $"Couldn't reach the Claude API at {http.BaseAddress} — check network connectivity.", ex);
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Claude API request failed ({Status}): {Body}", response.StatusCode, body);
            throw new ShoppingOrganizeUnavailableException($"Claude API returned {response.StatusCode}");
        }

        var message = await response.Content.ReadFromJsonAsync<ClaudeMessageResponse>(cancellationToken: ct);
        if (message?.StopReason == "refusal")
        {
            logger.LogWarning("Claude declined the organize request (stop_reason=refusal)");
            return [];
        }

        var content = message?.Content?.FirstOrDefault(b => b.Type == "text")?.Text;
        if (options.Value.LogPrompts)
        {
            logger.LogInformation("Claude organize response:\n{Content}", content);
        }

        return ShoppingOrganizeParser.Parse(content, items.Select(i => i.Id).ToList(), logger);
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
