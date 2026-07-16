using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Services;

/// <summary>Periodic sweep that turns stored-but-inert reminder data (CalendarEvent.Reminders,
/// Chore.AlarmTime) into actual Web Push sends. Ticks every minute; SentReminder rows make each
/// send idempotent across ticks/restarts. A reminder only fires within CatchUpWindow of its due
/// time, so extended downtime doesn't cause a flood of stale notifications on restart.</summary>
public class ReminderCheckService(IServiceScopeFactory scopeFactory, ILogger<ReminderCheckService> logger) : BackgroundService
{
    private static readonly TimeSpan TickInterval = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan CatchUpWindow = TimeSpan.FromHours(1);
    private static readonly TimeSpan EventLookahead = TimeSpan.FromDays(2); // > the largest Reminders preset (1440 min)

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TickInterval);
        do
        {
            try
            {
                await TickAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Reminder check tick failed");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task TickAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var push = scope.ServiceProvider.GetRequiredService<PushNotificationService>();
        var now = DateTime.UtcNow;

        await CheckCalendarRemindersAsync(db, push, now, ct);
        await CheckChoreAlarmsAsync(db, push, now, ct);
    }

    private async Task CheckCalendarRemindersAsync(AppDbContext db, PushNotificationService push, DateTime now, CancellationToken ct)
    {
        var events = await db.CalendarEvents
            .Include(e => e.Attendees)
            .Include(e => e.Exceptions)
            .Where(e => e.Reminders != null)
            .ToListAsync(ct);

        foreach (var evt in events)
        {
            var offsets = ParseReminderMinutes(evt.Reminders).ToList();
            if (offsets.Count == 0) continue;

            foreach (var occurrenceStart in OccurrenceStarts(evt, now))
            {
                foreach (var offsetMinutes in offsets)
                {
                    var triggerTime = occurrenceStart.AddMinutes(-offsetMinutes);
                    if (now < triggerTime || now - triggerTime > CatchUpWindow) continue;

                    var key = $"{occurrenceStart:O}:{offsetMinutes}";
                    var alreadySent = await db.SentReminders.AnyAsync(
                        r => r.Kind == SentReminderKind.CalendarEventReminder && r.SourceId == evt.Id && r.Key == key, ct);
                    if (alreadySent) continue;

                    var recipientIds = new HashSet<Guid> { evt.OwnerId };
                    recipientIds.UnionWith(evt.Attendees.Select(a => a.UserId));
                    await push.NotifyUsersAsync(recipientIds, new PushPayload(evt.Title, FormatReminderBody(offsetMinutes)));

                    db.SentReminders.Add(new SentReminder
                    {
                        Id = Guid.NewGuid(),
                        Kind = SentReminderKind.CalendarEventReminder,
                        SourceId = evt.Id,
                        Key = key,
                        SentAt = now,
                    });
                    await db.SaveChangesAsync(ct);
                }
            }
        }
    }

    /// <summary>Effective occurrence start times within the lookahead window — mirrors
    /// EventsController.Get's exception handling (skip cancelled instances, honor per-instance
    /// Start overrides) so a moved/cancelled occurrence doesn't fire a reminder at the wrong time.</summary>
    private static IEnumerable<DateTime> OccurrenceStarts(CalendarEvent evt, DateTime now)
    {
        if (evt.RecurrenceFrequency is null)
        {
            yield return evt.Start;
            yield break;
        }

        var exceptionsByDate = evt.Exceptions.ToDictionary(x => x.Date);
        foreach (var (instanceStart, _) in RecurrenceExpander.Expand(evt, now.Add(-CatchUpWindow), now.Add(EventLookahead)))
        {
            var date = DateOnly.FromDateTime(instanceStart);
            if (exceptionsByDate.TryGetValue(date, out var occurrenceException))
            {
                if (occurrenceException.Cancelled) continue;
                yield return occurrenceException.Start ?? instanceStart;
            }
            else
            {
                yield return instanceStart;
            }
        }
    }

    private async Task CheckChoreAlarmsAsync(AppDbContext db, PushNotificationService push, DateTime now, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(now);

        var chores = await db.Chores
            .Include(c => c.Assignments)
            .Include(c => c.Completions.Where(comp => comp.Date == today))
            .Where(c => c.AlarmTime != null)
            .ToListAsync(ct);

        foreach (var chore in chores)
        {
            if (!ChoreScheduling.IsDueOn(chore, today)) continue;
            if (chore.Completions.Count > 0) continue; // already done today — no need to alarm

            var triggerTime = today.ToDateTime(chore.AlarmTime!.Value);
            if (now < triggerTime || now - triggerTime > CatchUpWindow) continue;

            var key = today.ToString("O");
            var alreadySent = await db.SentReminders.AnyAsync(
                r => r.Kind == SentReminderKind.ChoreAlarm && r.SourceId == chore.Id && r.Key == key, ct);
            if (alreadySent) continue;

            var recipientIds = chore.Assignments.Select(a => a.UserId);
            await push.NotifyUsersAsync(recipientIds, new PushPayload(chore.Title, "Time to take care of this chore"));

            db.SentReminders.Add(new SentReminder
            {
                Id = Guid.NewGuid(),
                Kind = SentReminderKind.ChoreAlarm,
                SourceId = chore.Id,
                Key = key,
                SentAt = now,
            });
            await db.SaveChangesAsync(ct);
        }
    }

    private static string FormatReminderBody(int offsetMinutes) => offsetMinutes switch
    {
        0 => "Starting now",
        < 60 => $"Starting in {offsetMinutes} minutes",
        < 1440 => $"Starting in {offsetMinutes / 60} hour{(offsetMinutes / 60 == 1 ? "" : "s")}",
        _ => $"Starting in {offsetMinutes / 1440} day{(offsetMinutes / 1440 == 1 ? "" : "s")}",
    };

    private static IEnumerable<int> ParseReminderMinutes(string? csv) =>
        (csv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => int.TryParse(s, out var n) ? n : -1)
            .Where(n => n >= 0);
}
