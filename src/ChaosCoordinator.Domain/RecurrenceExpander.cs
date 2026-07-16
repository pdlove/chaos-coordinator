namespace ChaosCoordinator.Domain;

public static class RecurrenceExpander
{
    /// <summary>
    /// Yields (instanceStart, instanceEnd) pairs for each occurrence of a recurring event
    /// that could overlap with [rangeFrom, rangeTo). Caller applies EventExceptions (cancellations
    /// and per-instance overrides). For non-recurring events, yields the event's own Start/End
    /// exactly once.
    /// </summary>
    public static IEnumerable<(DateTime Start, DateTime? End)> Expand(
        CalendarEvent evt, DateTime rangeFrom, DateTime rangeTo)
    {
        if (evt.RecurrenceFrequency is null)
        {
            yield return (evt.Start, evt.End);
            yield break;
        }

        var timeOfDay = evt.Start.TimeOfDay;
        var duration = evt.End.HasValue ? evt.End.Value - evt.Start : (TimeSpan?)null;
        var seriesEnd = evt.RecurrenceEnd.HasValue
            ? evt.RecurrenceEnd.Value.Date
            : rangeTo.Date; // cap to query window if open-ended
        var interval = Math.Max(1, evt.RecurrenceInterval);

        var candidates = evt.RecurrenceFrequency switch
        {
            RecurrenceFrequency.Daily => DailyCandidates(evt.Start.Date, seriesEnd, interval),
            RecurrenceFrequency.Weekly => WeeklyCandidates(evt, seriesEnd, interval),
            RecurrenceFrequency.Monthly => MonthlyCandidates(evt, seriesEnd, interval),
            _ => Enumerable.Empty<DateOnly>(),
        };

        foreach (var day in candidates)
        {
            var instanceStart = day.ToDateTime(TimeOnly.FromTimeSpan(timeOfDay));
            var instanceEnd = duration.HasValue ? instanceStart + duration.Value : (DateTime?)null;

            if (instanceStart < rangeTo && (instanceEnd ?? instanceStart) >= rangeFrom)
                yield return (instanceStart, instanceEnd);
        }
    }

    private static IEnumerable<DateOnly> DailyCandidates(DateTime startDate, DateTime seriesEnd, int interval)
    {
        var cursor = startDate;
        while (cursor <= seriesEnd)
        {
            yield return DateOnly.FromDateTime(cursor);
            cursor = cursor.AddDays(interval);
        }
    }

    private static IEnumerable<DateOnly> WeeklyCandidates(CalendarEvent evt, DateTime seriesEnd, int interval)
    {
        var days = (evt.RecurrenceDays ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(int.Parse)
            .ToHashSet();
        if (days.Count == 0) yield break;

        var startDate = evt.Start.Date;
        var cursor = startDate;
        while (cursor <= seriesEnd)
        {
            var weeksSinceStart = (cursor - startDate).Days / 7;
            if (weeksSinceStart % interval == 0 && days.Contains((int)cursor.DayOfWeek))
                yield return DateOnly.FromDateTime(cursor);
            cursor = cursor.AddDays(1);
        }
    }

    /// <summary>Steps month-by-month (by RecurrenceInterval), picking one candidate date per
    /// visited month — either a fixed day-of-month (RecurrenceMonthDay) or an nth/last weekday
    /// (RecurrenceWeekOrdinal + RecurrenceWeekday).</summary>
    private static IEnumerable<DateOnly> MonthlyCandidates(CalendarEvent evt, DateTime seriesEnd, int interval)
    {
        var startDate = evt.Start.Date;
        var monthCursor = new DateTime(startDate.Year, startDate.Month, 1);
        var endMonth = new DateTime(seriesEnd.Year, seriesEnd.Month, 1);

        while (monthCursor <= endMonth)
        {
            var candidate = evt.RecurrenceMonthDay.HasValue
                ? DayOfMonth(monthCursor, evt.RecurrenceMonthDay.Value)
                : NthWeekdayOfMonth(monthCursor, evt.RecurrenceWeekOrdinal ?? 1, evt.RecurrenceWeekday ?? 0);

            if (candidate.HasValue && candidate.Value >= startDate && candidate.Value <= seriesEnd)
                yield return DateOnly.FromDateTime(candidate.Value);

            monthCursor = monthCursor.AddMonths(interval);
        }
    }

    private static DateTime DayOfMonth(DateTime monthStart, int day)
    {
        var daysInMonth = DateTime.DaysInMonth(monthStart.Year, monthStart.Month);
        var actualDay = day == -1 ? daysInMonth : Math.Clamp(day, 1, daysInMonth);
        return new DateTime(monthStart.Year, monthStart.Month, actualDay);
    }

    private static DateTime? NthWeekdayOfMonth(DateTime monthStart, int ordinal, int weekday)
    {
        var daysInMonth = DateTime.DaysInMonth(monthStart.Year, monthStart.Month);
        var matches = Enumerable.Range(1, daysInMonth)
            .Select(d => new DateTime(monthStart.Year, monthStart.Month, d))
            .Where(d => (int)d.DayOfWeek == weekday)
            .ToList();

        if (matches.Count == 0) return null;
        if (ordinal == -1) return matches[^1];

        var index = ordinal - 1;
        return index >= 0 && index < matches.Count ? matches[index] : null;
    }
}
