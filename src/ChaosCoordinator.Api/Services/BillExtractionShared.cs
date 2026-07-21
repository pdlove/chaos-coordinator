using System.Text.Json;
using System.Text.Json.Nodes;

namespace ChaosCoordinator.Api.Services;

/// <summary>JSON Schema for the structured bill-extraction output — shared by every
/// IBillExtractionService backend, same shape story as EventExtractionSchema.</summary>
public static class BillExtractionSchema
{
    public static readonly JsonNode Node = JsonNode.Parse("""
        {
          "type": "object",
          "properties": {
            "title": { "type": ["string", "null"], "description": "The payee/company/biller name, e.g. 'Pacific Gas & Electric' or 'City Water Dept'" },
            "amount": { "type": ["number", "null"], "description": "The total amount due, as a plain number with no currency symbol" },
            "dueDate": { "type": ["string", "null"], "description": "ISO 8601 date (YYYY-MM-DD) the payment is due, or null if no due date is shown" },
            "accountNumber": { "type": ["string", "null"], "description": "The account/customer number this bill is for, exactly as printed, or null if none is shown" }
          },
          "required": ["title", "amount", "dueDate", "accountNumber"],
          "additionalProperties": false
        }
        """)!;
}

/// <summary>Builds the bill-extraction prompt text — identical wording regardless of which vision
/// backend answers it.</summary>
public static class BillExtractionPrompt
{
    public static string Build(int imageCount)
    {
        var imagesDescription = imageCount == 1
            ? "The attached image is a photo of a bill or invoice."
            : $"The attached {imageCount} images are photos of different pages of the *same single* " +
              "bill or invoice — not separate bills. Combine information across all of them into one result.";

        return
            $"{imagesDescription}\n\n" +
            $"Today's date is {DateOnly.FromDateTime(DateTime.Now):yyyy-MM-dd}. Read the payee/biller name, " +
            "the total amount due, the payment due date, and the account/customer number this bill is for " +
            "(if one is shown). If a year isn't shown for the due date, assume the next occurrence of that " +
            "month/day on or after today. If any of these things isn't clearly shown on the bill, leave that " +
            "field null rather than guessing. Respond with JSON only, matching the given schema.";
    }
}

/// <summary>Parses a vision backend's raw JSON text response into a validated ExtractedBillFields,
/// defaulting to all-null fields (never throwing) on unparseable content — an extraction failure
/// should fall through to "no fields read, pick a match manually" rather than blowing up the
/// request.</summary>
public static class BillExtractionParser
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static ExtractedBillFields Parse(string? content, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            logger.LogWarning("Vision backend returned no extractable content for bill scan");
            return new ExtractedBillFields(null, null, null, null);
        }

        RawBillFields? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<RawBillFields>(content, JsonOptions);
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Couldn't parse the vision backend's bill JSON response: {Content}", content);
            return new ExtractedBillFields(null, null, null, null);
        }

        if (parsed is null) return new ExtractedBillFields(null, null, null, null);

        var title = string.IsNullOrWhiteSpace(parsed.Title) ? null : parsed.Title.Trim();
        var dueDate = DateOnly.TryParse(parsed.DueDate, out var date) ? date : (DateOnly?)null;
        var accountNumber = string.IsNullOrWhiteSpace(parsed.AccountNumber) ? null : parsed.AccountNumber.Trim();
        return new ExtractedBillFields(title, parsed.Amount, dueDate, accountNumber);
    }

    private record RawBillFields(string? Title, decimal? Amount, string? DueDate, string? AccountNumber);
}
