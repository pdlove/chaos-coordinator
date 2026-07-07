namespace ChaosCoordinator.Domain;

public static class ChoreScheduling
{
    /// <summary>Whether a chore recurs on the given date. Weekly chores use RecurrenceDays to
    /// hold their single anchor weekday (e.g. "6" for Saturday) — same field CustomDays uses for
    /// multiple weekdays, just with one value. A deliberate simplification vs. a full RRULE engine.</summary>
    public static bool IsDueOn(Chore chore, DateOnly date)
    {
        if (chore.Archived) return false;

        return chore.RecurrenceType switch
        {
            RecurrenceType.Daily => true,
            RecurrenceType.Weekly or RecurrenceType.CustomDays => ParseDays(chore.RecurrenceDays).Contains((int)date.DayOfWeek),
            _ => false,
        };
    }

    private static IEnumerable<int> ParseDays(string? csv) =>
        (csv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => int.TryParse(s, out var n) ? n : -1)
            .Where(n => n is >= 0 and <= 6);
}
