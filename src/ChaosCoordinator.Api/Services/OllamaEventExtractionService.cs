using System.Text.Json;
using System.Text.Json.Nodes;
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
    // "null" is listed as a valid array member (not just omitted) because Ollama's structured
    // output enforces the schema strictly — a model that doesn't see a time on the page needs a
    // legal way to say so instead of hallucinating one to satisfy a plain "string" type.
    private static readonly JsonNode ResponseSchema = JsonNode.Parse("""
        {
          "type": "object",
          "properties": {
            "events": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "title": { "type": "string" },
                  "date": { "type": "string", "description": "ISO 8601 date, YYYY-MM-DD" },
                  "startTime": { "type": ["string", "null"], "description": "24-hour HH:mm, or null if no time is given" },
                  "endTime": { "type": ["string", "null"], "description": "24-hour HH:mm, or null if no end time is given" },
                  "location": { "type": ["string", "null"] },
                  "notes": { "type": ["string", "null"], "description": "Any other relevant detail (cost, what to bring, contact info, etc.)" }
                },
                "required": ["title", "date", "startTime", "endTime", "location", "notes"]
              }
            }
          },
          "required": ["events"]
        }
        """)!;

    public async Task<List<ExtractedEventFields>> ExtractAsync(
        IReadOnlyList<byte[]> images, string? pastedText, CancellationToken ct)
    {
        var prompt = BuildPrompt(pastedText);
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
            format = ResponseSchema,
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
        if (string.IsNullOrWhiteSpace(content))
        {
            logger.LogWarning("Ollama returned an empty message content");
            return [];
        }

        ExtractionPayload? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<ExtractionPayload>(content, JsonOptions);
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Couldn't parse Ollama's JSON response: {Content}", content);
            return [];
        }

        var results = new List<ExtractedEventFields>();
        foreach (var raw in parsed?.Events ?? [])
        {
            if (string.IsNullOrWhiteSpace(raw.Title) || !DateOnly.TryParse(raw.Date, out var date))
            {
                logger.LogWarning("Skipping unparseable extracted event: {Raw}", raw);
                continue;
            }
            results.Add(new ExtractedEventFields(
                raw.Title.Trim(),
                date,
                TryParseTime(raw.StartTime),
                TryParseTime(raw.EndTime),
                string.IsNullOrWhiteSpace(raw.Location) ? null : raw.Location.Trim(),
                string.IsNullOrWhiteSpace(raw.Notes) ? null : raw.Notes.Trim()
            ));
        }
        return results;
    }

    private static TimeOnly? TryParseTime(string? value) =>
        !string.IsNullOrWhiteSpace(value) && TimeOnly.TryParse(value, out var t) ? t : null;

    private static string BuildPrompt(string? pastedText)
    {
        var text = string.IsNullOrWhiteSpace(pastedText)
            ? "Look at the attached image(s) — they're a photo of something like a flyer, permission " +
              "slip, invitation, or schedule."
            : "Read the following pasted text — it describes something like a flyer, permission slip, " +
              $"invitation, or schedule:\n\n{pastedText}\n\n";

        return
            $"{text}\n\n" +
            $"Today's date is {DateOnly.FromDateTime(DateTime.Now):yyyy-MM-dd}. Extract every distinct " +
            "calendar-worthy event you can find (there may be one, or several — e.g. a list of dates). " +
            "For each one, give its title, date, start time, end time, location, and any other useful " +
            "notes (cost, what to bring, contact info). If a year isn't shown, assume the next " +
            "occurrence of that month/day on or after today. If no time is given at all, leave " +
            "startTime and endTime null rather than guessing one. Respond with JSON only, matching the " +
            "given schema.";
    }

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private record OllamaChatResponse([property: JsonPropertyName("message")] OllamaMessage? Message);
    private record OllamaMessage([property: JsonPropertyName("content")] string? Content);

    private record ExtractionPayload(List<ExtractionEventRaw> Events);
    private record ExtractionEventRaw(string Title, string Date, string? StartTime, string? EndTime, string? Location, string? Notes);
}
