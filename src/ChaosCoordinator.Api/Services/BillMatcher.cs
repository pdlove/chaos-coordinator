using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Services;

/// <summary>Scores existing/predicted Bills against a scanned photo's extracted fields — same
/// title-similarity idea as EventDuplicateDetector, plus amount/due-date proximity since bills
/// (unlike events) always carry those. Purely advisory: BillPhotoImportController always shows the
/// results on a confirmation screen and never attaches anything on its own.</summary>
public static class BillMatcher
{
    // Below this a candidate isn't worth showing at all — a bare due-date-only or
    // barely-similar-title match is more noise than help on the review screen.
    private const double MinimumScore = 0.15;

    // Above this, the top candidate is confident enough to flag as the likely match in the UI —
    // still never auto-attached, the user always taps to confirm.
    public const double BestGuessThreshold = 0.55;

    public static List<(Bill Bill, double Score)> FindCandidates(
        string? extractedTitle, decimal? extractedAmount, DateOnly? extractedDueDate,
        IReadOnlyList<Bill> candidateBills)
    {
        var normalizedExtractedTitle = extractedTitle is null ? null : Normalize(extractedTitle);

        return candidateBills
            .Select(bill => (Bill: bill, Score: Score(normalizedExtractedTitle, extractedAmount, extractedDueDate, bill)))
            .Where(x => x.Score >= MinimumScore)
            .OrderByDescending(x => x.Score)
            .Take(5)
            .ToList();
    }

    private static double Score(string? normalizedExtractedTitle, decimal? extractedAmount, DateOnly? extractedDueDate, Bill bill)
    {
        var score = 0.0;

        if (normalizedExtractedTitle is not null)
        {
            score += 0.55 * TitleSimilarity(normalizedExtractedTitle, Normalize(bill.Title));
        }

        if (extractedAmount is not null)
        {
            var withinRange = bill.AmountMin is not null && bill.AmountMax is not null
                && extractedAmount >= bill.AmountMin && extractedAmount <= bill.AmountMax;
            var closeToExact = bill.Amount is not null && Math.Abs(bill.Amount.Value - extractedAmount.Value) <= 0.5m;
            if (closeToExact || withinRange) score += 0.25;
        }

        if (extractedDueDate is not null)
        {
            var daysApart = Math.Abs(bill.DueDate.DayNumber - extractedDueDate.Value.DayNumber);
            if (daysApart <= 14) score += 0.20 * (1.0 - daysApart / 14.0);
        }

        return score;
    }

    private static string Normalize(string s) =>
        new string(s.ToLowerInvariant().Where(c => char.IsLetterOrDigit(c) || c == ' ').ToArray()).Trim();

    /// <summary>Levenshtein-distance-based similarity ratio in [0,1], with a substring shortcut —
    /// a short extracted payee name (e.g. "PG&E") is often a strict substring/superstring of the
    /// household's own bill title (e.g. "Electric (PG&E)") or vice versa, which pure edit distance
    /// penalizes heavily just for the length mismatch even though it's clearly the same biller.</summary>
    private static double TitleSimilarity(string a, string b)
    {
        if (a.Length == 0 || b.Length == 0) return a == b ? 1 : 0;
        if (a.Contains(b) || b.Contains(a)) return 0.85;

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
