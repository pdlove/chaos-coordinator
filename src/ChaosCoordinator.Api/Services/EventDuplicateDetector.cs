using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Services;

/// <summary>Flags an extracted candidate as a likely duplicate of an existing household event —
/// simple title-similarity + same-day heuristic, not fuzzy-matched against location/attendees.
/// False positives are cheap (the review screen just unchecks the box by default; the user can
/// still create it anyway) so this leans a little aggressive rather than trying to be precise.</summary>
public static class EventDuplicateDetector
{
    private const double SimilarityThreshold = 0.6;

    public record DuplicateMatch(Guid EventId, string Title, DateTime Start);

    /// <summary>householdEvents: candidate events for the household already loaded from the DB —
    /// callers should query a window wide enough to cover every extracted candidate's date ± 1
    /// day. Recurring series are expanded via RecurrenceExpander so a weekly "Soccer practice"
    /// still matches a freshly-extracted "Soccer practice" on one of its occurrence dates.</summary>
    public static DuplicateMatch? FindDuplicate(
        string candidateTitle, DateOnly candidateDate, IReadOnlyList<CalendarEvent> householdEvents)
    {
        // Exclusive upper bound (Expand's rangeTo), so +2 days is needed to include candidateDate+1.
        var from = candidateDate.AddDays(-1).ToDateTime(TimeOnly.MinValue);
        var to = candidateDate.AddDays(2).ToDateTime(TimeOnly.MinValue);
        var normalizedCandidate = Normalize(candidateTitle);

        DuplicateMatch? best = null;
        var bestScore = 0.0;

        foreach (var evt in householdEvents)
        {
            var score = TitleSimilarity(normalizedCandidate, Normalize(evt.Title));
            if (score < SimilarityThreshold || score <= bestScore) continue;

            foreach (var (start, _) in RecurrenceExpander.Expand(evt, from, to))
            {
                bestScore = score;
                best = new DuplicateMatch(evt.Id, evt.Title, start);
                break;
            }
        }

        return best;
    }

    private static string Normalize(string s) =>
        new string(s.ToLowerInvariant().Where(c => char.IsLetterOrDigit(c) || c == ' ').ToArray())
            .Trim();

    /// <summary>Levenshtein-distance-based similarity ratio in [0,1] — 1 means identical.</summary>
    private static double TitleSimilarity(string a, string b)
    {
        if (a.Length == 0 || b.Length == 0) return a == b ? 1 : 0;
        var maxLen = Math.Max(a.Length, b.Length);
        return 1.0 - (double)LevenshteinDistance(a, b) / maxLen;
    }

    private static int LevenshteinDistance(string a, string b)
    {
        var dp = new int[a.Length + 1, b.Length + 1];
        for (var i = 0; i <= a.Length; i++) dp[i, 0] = i;
        for (var j = 0; j <= b.Length; j++) dp[0, j] = j;

        for (var i = 1; i <= a.Length; i++)
        {
            for (var j = 1; j <= b.Length; j++)
            {
                var cost = a[i - 1] == b[j - 1] ? 0 : 1;
                dp[i, j] = Math.Min(Math.Min(dp[i - 1, j] + 1, dp[i, j - 1] + 1), dp[i - 1, j - 1] + cost);
            }
        }
        return dp[a.Length, b.Length];
    }
}
