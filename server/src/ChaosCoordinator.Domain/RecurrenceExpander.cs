namespace ChaosCoordinator.Domain;

public static class RecurrenceExpander
{
    /// <summary>
    /// Yields (instanceStart, instanceEnd) pairs for each occurrence of a recurring event
    /// that could overlap with [rangeFrom, rangeTo). Caller filters out EventExceptions.
    /// For non-recurring events, yields the event's own Start/End exactly once.
    /// </summary>
    public static IEnumerable<(DateTime Start, DateTime? End)> Expand(
        CalendarEvent evt, DateTime rangeFrom, DateTime rangeTo)
    {
        if (evt.RecurrenceDays is null)
        {
            yield return (evt.Start, evt.End);
            yield break;
        }

        var days = evt.RecurrenceDays
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(int.Parse)
            .ToHashSet();

        var timeOfDay = evt.Start.TimeOfDay;
        var duration = evt.End.HasValue ? evt.End.Value - evt.Start : (TimeSpan?)null;
        var seriesEnd = evt.RecurrenceEnd.HasValue
            ? evt.RecurrenceEnd.Value.Date
            : rangeTo.Date;  // cap to query window if open-ended

        var cursor = evt.Start.Date;
        while (cursor <= seriesEnd)
        {
            if (days.Contains((int)cursor.DayOfWeek))
            {
                var instanceStart = cursor + timeOfDay;
                var instanceEnd = duration.HasValue ? instanceStart + duration.Value : (DateTime?)null;

                // Only yield if this instance overlaps with the requested range
                if (instanceStart < rangeTo && (instanceEnd ?? instanceStart) >= rangeFrom)
                    yield return (instanceStart, instanceEnd);
            }
            cursor = cursor.AddDays(1);
        }
    }
}
