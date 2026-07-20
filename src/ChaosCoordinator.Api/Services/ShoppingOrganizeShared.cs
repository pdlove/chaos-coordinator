using System.Text.Json;
using System.Text.Json.Nodes;

namespace ChaosCoordinator.Api.Services;

/// <summary>JSON Schema for the structured "organize this shopping list" output — shared by every
/// IShoppingListOrganizerService backend (Ollama's "format" field, Claude's
/// output_config.format.schema), same shape as EventExtractionSchema's role for the photo-import
/// feature. The model defines the categories themselves (name + which items go in each), rather
/// than tagging each item with a free-form department string — that was prone to producing
/// muddy compound labels like "Deli/Meat/Dairy" when the model tried to keep same-department
/// items contiguous by hand.</summary>
public static class ShoppingOrganizeSchema
{
    public static readonly JsonNode Node = JsonNode.Parse("""
        {
          "type": "object",
          "properties": {
            "categories": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "name": { "type": "string", "description": "A short, single grocery-store department name, e.g. Produce, Bakery, Deli, Meat & Seafood, Dairy, Frozen, Pantry, Snacks, Beverages, Household, Personal Care. Never combine more than one department into one name." },
                  "itemIds": { "type": "array", "items": { "type": "string" }, "description": "ids of the items placed in this category, in the order they should appear" }
                },
                "required": ["name", "itemIds"],
                "additionalProperties": false
              }
            }
          },
          "required": ["categories"],
          "additionalProperties": false
        }
        """)!;
}

/// <summary>Builds the "organize this list" prompt — identical wording regardless of which
/// backend answers it.</summary>
public static class ShoppingOrganizePrompt
{
    public static string Build(IReadOnlyList<ShoppingItemToOrganize> items)
    {
        var lines = items.Select(i =>
            $"- id: {i.Id}, name: \"{i.Name}\"" + (string.IsNullOrWhiteSpace(i.Department) ? "" : $", current department: \"{i.Department}\""));

        return
            "Here is a household's shopping list:\n\n" +
            string.Join("\n", lines) +
            "\n\nGroup these items into a small number of clean, single grocery-store " +
            "categories/departments — decide the specific category names and how many are needed based " +
            "on what's actually on this list. Keep each category name short and singular; never merge " +
            "more than one department into one name (e.g. \"Dairy\" and \"Frozen\" must be separate " +
            "categories, not \"Dairy/Frozen\"). Order the categories as a sensible single-pass walking " +
            "route through a typical store — start near the entrance (produce/bakery), move through " +
            "deli/meat/dairy/frozen, then packaged goods/pantry/snacks/beverages, and finish with " +
            "household/personal care near checkout. Within each category, order the items sensibly. " +
            "Every item must appear in exactly one category, using its exact given id. Respond with JSON " +
            "only, matching the given schema.";
    }
}

/// <summary>Parses an organizer backend's raw JSON text response into validated categories,
/// dropping any item id that doesn't match one the request actually sent (a model can't be
/// trusted not to invent or mangle an id) and de-duplicating any id the model placed in more than
/// one category (keeping its first placement) rather than failing the whole batch.</summary>
public static class ShoppingOrganizeParser
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static List<OrganizedCategory> Parse(string? content, IReadOnlyCollection<Guid> knownIds, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            logger.LogWarning("Organizer backend returned no content");
            return [];
        }

        OrganizePayload? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<OrganizePayload>(content, JsonOptions);
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Couldn't parse the organizer backend's JSON response: {Content}", content);
            return [];
        }

        var known = knownIds.ToHashSet();
        var seen = new HashSet<Guid>();
        var results = new List<OrganizedCategory>();
        foreach (var raw in parsed?.Categories ?? [])
        {
            if (string.IsNullOrWhiteSpace(raw.Name)) continue;

            var ids = new List<Guid>();
            foreach (var rawId in raw.ItemIds ?? [])
            {
                if (Guid.TryParse(rawId, out var id) && known.Contains(id) && seen.Add(id))
                {
                    ids.Add(id);
                }
                else
                {
                    logger.LogWarning("Skipping unrecognized/duplicate organize item id: {RawId}", rawId);
                }
            }
            if (ids.Count > 0) results.Add(new OrganizedCategory(raw.Name.Trim(), ids));
        }
        return results;
    }

    private record OrganizePayload(List<OrganizeCategoryRaw> Categories);
    private record OrganizeCategoryRaw(string Name, List<string> ItemIds);
}
