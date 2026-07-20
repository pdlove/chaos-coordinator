using System.Text.Json;
using System.Text.Json.Nodes;

namespace ChaosCoordinator.Api.Services;

/// <summary>JSON Schema for the structured event-extraction output — shared by every
/// IEventExtractionService backend (Ollama's "format" field, Claude's
/// output_config.format.schema) since both accept the same JSON Schema shape.
/// "additionalProperties": false is required by Claude's structured outputs; Ollama ignores it.</summary>
public static class EventExtractionSchema
{
    // "null" is listed as a valid array member (not just omitted) because structured-output
    // enforcement is strict on both providers — a model that doesn't see a time on the page needs
    // a legal way to say so instead of hallucinating one to satisfy a plain "string" type.
    public static readonly JsonNode Node = JsonNode.Parse("""
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
                "required": ["title", "date", "startTime", "endTime", "location", "notes"],
                "additionalProperties": false
              }
            }
          },
          "required": ["events"],
          "additionalProperties": false
        }
        """)!;
}

/// <summary>Builds the extraction prompt text — identical wording regardless of which vision
/// backend answers it.</summary>
public static class EventExtractionPrompt
{
    public static string Build(string? pastedText, int imageCount)
    {
        var text = imageCount == 0
            ? "Read the following pasted text — it describes something like a flyer, permission slip, " +
              $"invitation, or schedule:\n\n{pastedText}\n\n"
            : "Look at the attached image(s) — they're a photo of something like a flyer, permission " +
              "slip, invitation, or schedule.";

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
}

/// <summary>Parses a vision backend's raw JSON text response (already extracted from whatever
/// envelope that provider wraps it in) into validated ExtractedEventFields, skipping entries with
/// an unparseable title/date rather than failing the whole batch.</summary>
public static class EventExtractionParser
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static List<ExtractedEventFields> Parse(string? content, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            logger.LogWarning("Vision backend returned no extractable content");
            return [];
        }

        ExtractionPayload? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<ExtractionPayload>(content, JsonOptions);
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Couldn't parse the vision backend's JSON response: {Content}", content);
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

    private record ExtractionPayload(List<ExtractionEventRaw> Events);
    private record ExtractionEventRaw(string Title, string Date, string? StartTime, string? EndTime, string? Location, string? Notes);
}
