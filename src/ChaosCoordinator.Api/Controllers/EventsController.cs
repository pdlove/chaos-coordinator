using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/events")]
public class EventsController(
    AppDbContext db,
    ICurrentUserAccessor currentUser,
    HouseholdContext household,
    IPinElevationStore pinElevation,
    IHouseholdNotifier notifier
) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<CalendarEventDto>>> Get(
        [FromQuery] DateTime from, [FromQuery] DateTime to, [FromQuery] EventCategory? category)
    {
        // For recurring events: include the series if it starts before 'to' AND hasn't ended before 'from'
        var query = db.CalendarEvents
            .Include(e => e.Owner)
            .Include(e => e.Attendees).ThenInclude(a => a.User)
            .Include(e => e.Exceptions)
            .Where(e => e.HouseholdId == household.HouseholdId
                && (e.RecurrenceFrequency == null
                    ? e.Start < to && (e.End ?? e.Start) >= from
                    : e.Start < to && (e.RecurrenceEnd == null || e.RecurrenceEnd >= from)));

        if (category is not null) query = query.Where(e => e.Category == category);

        var events = await query.OrderBy(e => e.Start).ToListAsync();

        var result = new List<CalendarEventDto>();
        foreach (var evt in events)
        {
            if (evt.RecurrenceFrequency is null)
            {
                result.Add(evt.ToDto(currentUser.UserId, null));
            }
            else
            {
                var exceptionsByDate = evt.Exceptions.ToDictionary(x => x.Date);
                foreach (var (instanceStart, _) in RecurrenceExpander.Expand(evt, from, to))
                {
                    var date = DateOnly.FromDateTime(instanceStart);
                    if (exceptionsByDate.TryGetValue(date, out var occurrenceException))
                    {
                        if (occurrenceException.Cancelled) continue;
                        result.Add(evt.ToDto(currentUser.UserId, instanceStart, occurrenceException));
                    }
                    else
                    {
                        result.Add(evt.ToDto(currentUser.UserId, instanceStart));
                    }
                }
            }
        }

        return Ok(result.OrderBy(e => e.Start).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<CalendarEventDto>> Create(CreateEventRequest request)
    {
        if (currentUser.UserId is not { } ownerId)
            return BadRequest(new { error = "no_profile_selected" });

        var attendeeIds = new HashSet<Guid>(request.AttendeeUserIds) { ownerId };

        var evt = new CalendarEvent
        {
            Id = Guid.NewGuid(),
            HouseholdId = household.HouseholdId,
            Title = request.Title,
            Start = request.Start,
            End = request.End,
            Category = request.Category,
            Location = request.Location,
            Notes = request.Notes,
            RecurrenceFrequency = request.RecurrenceFrequency,
            RecurrenceInterval = request.RecurrenceInterval,
            RecurrenceDays = request.RecurrenceDays,
            RecurrenceMonthDay = request.RecurrenceMonthDay,
            RecurrenceWeekOrdinal = request.RecurrenceWeekOrdinal,
            RecurrenceWeekday = request.RecurrenceWeekday,
            RecurrenceEnd = request.RecurrenceEnd,
            TravelTimeLeaveBy = request.TravelTimeLeaveBy,
            Reminders = request.Reminders,
            OwnerId = ownerId,
            CreatedAt = DateTime.UtcNow,
            Attendees = attendeeIds.Select(uid => new EventAttendee { UserId = uid }).ToList(),
        };
        db.CalendarEvents.Add(evt);
        await db.SaveChangesAsync();

        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return await Reload(evt.Id);
    }

    /// <summary>Edits the whole series ("all events"). For a single recurring instance, use
    /// POST {id}/instances; for "this and following", use POST {id}/split.</summary>
    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<CalendarEventDto>> Update(Guid id, UpdateEventRequest request)
    {
        var evt = await db.CalendarEvents
            .Include(e => e.Attendees)
            .FirstOrDefaultAsync(e => e.Id == id && e.HouseholdId == household.HouseholdId);
        if (evt is null) return NotFound();

        var authError = await CheckEditAuthorization(evt);
        if (authError is not null) return authError;

        evt.Title = request.Title;
        evt.Start = request.Start;
        evt.End = request.End;
        evt.Category = request.Category;
        evt.Location = request.Location;
        evt.Notes = request.Notes;
        evt.RecurrenceFrequency = request.RecurrenceFrequency;
        evt.RecurrenceInterval = request.RecurrenceInterval;
        evt.RecurrenceDays = request.RecurrenceDays;
        evt.RecurrenceMonthDay = request.RecurrenceMonthDay;
        evt.RecurrenceWeekOrdinal = request.RecurrenceWeekOrdinal;
        evt.RecurrenceWeekday = request.RecurrenceWeekday;
        evt.RecurrenceEnd = request.RecurrenceEnd;
        evt.TravelTimeLeaveBy = request.TravelTimeLeaveBy;
        evt.Reminders = request.Reminders;

        var attendeeIds = new HashSet<Guid>(request.AttendeeUserIds) { evt.OwnerId };
        db.EventAttendees.RemoveRange(evt.Attendees);
        evt.Attendees = attendeeIds.Select(uid => new EventAttendee { EventId = evt.Id, UserId = uid }).ToList();

        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return await Reload(evt.Id);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var evt = await db.CalendarEvents
            .FirstOrDefaultAsync(e => e.Id == id && e.HouseholdId == household.HouseholdId);
        if (evt is null) return NotFound();

        var authError = await CheckEditAuthorization(evt);
        if (authError is not null) return authError;

        db.CalendarEvents.Remove(evt);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return NoContent();
    }

    /// <summary>Cancel (skip) one occurrence of a recurring event without deleting the series.</summary>
    [HttpPost("{id:guid}/exceptions")]
    public async Task<IActionResult> CancelOccurrence(Guid id, CancelOccurrenceRequest request)
    {
        var evt = await db.CalendarEvents
            .FirstOrDefaultAsync(e => e.Id == id && e.HouseholdId == household.HouseholdId);
        if (evt is null) return NotFound();
        if (evt.RecurrenceFrequency is null) return BadRequest(new { error = "not_recurring" });

        var authError = await CheckEditAuthorization(evt);
        if (authError is not null) return authError;

        var date = DateOnly.FromDateTime(request.Date);
        var exception = await db.EventExceptions.FirstOrDefaultAsync(x => x.EventId == id && x.Date == date);
        if (exception is null)
        {
            db.EventExceptions.Add(new EventException { EventId = id, Date = date, Cancelled = true });
        }
        else
        {
            exception.Cancelled = true;
        }

        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return NoContent();
    }

    /// <summary>Edit just one occurrence ("this event only") — upserts a non-cancelling override.</summary>
    [HttpPost("{id:guid}/instances")]
    public async Task<IActionResult> EditOccurrence(Guid id, EditOccurrenceRequest request)
    {
        var evt = await db.CalendarEvents
            .FirstOrDefaultAsync(e => e.Id == id && e.HouseholdId == household.HouseholdId);
        if (evt is null) return NotFound();
        if (evt.RecurrenceFrequency is null) return BadRequest(new { error = "not_recurring" });

        var authError = await CheckEditAuthorization(evt);
        if (authError is not null) return authError;

        var date = DateOnly.FromDateTime(request.Date);
        var exception = await db.EventExceptions.FirstOrDefaultAsync(x => x.EventId == id && x.Date == date);
        if (exception is null)
        {
            exception = new EventException { EventId = id, Date = date };
            db.EventExceptions.Add(exception);
        }

        exception.Cancelled = false;
        exception.Title = request.Title;
        exception.Start = request.Start;
        exception.End = request.End;
        exception.Location = request.Location;
        exception.Notes = request.Notes;
        exception.Category = request.Category;

        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return NoContent();
    }

    /// <summary>Delete "this and following" — truncates the series the day before Date, with no
    /// continuation. If Date is on/before the series' own start, there's nothing left before it,
    /// so the whole series is deleted instead. For an edit that continues the series, use
    /// POST {id}/split.</summary>
    [HttpPost("{id:guid}/truncate")]
    public async Task<IActionResult> Truncate(Guid id, TruncateSeriesRequest request)
    {
        var evt = await db.CalendarEvents
            .Include(e => e.Exceptions)
            .FirstOrDefaultAsync(e => e.Id == id && e.HouseholdId == household.HouseholdId);
        if (evt is null) return NotFound();
        if (evt.RecurrenceFrequency is null) return BadRequest(new { error = "not_recurring" });

        var authError = await CheckEditAuthorization(evt);
        if (authError is not null) return authError;

        var truncateDate = DateOnly.FromDateTime(request.Date);
        if (truncateDate <= DateOnly.FromDateTime(evt.Start))
        {
            db.CalendarEvents.Remove(evt);
        }
        else
        {
            evt.RecurrenceEnd = DateTime.SpecifyKind(truncateDate.AddDays(-1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            db.EventExceptions.RemoveRange(evt.Exceptions.Where(x => x.Date >= truncateDate));
        }

        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return NoContent();
    }

    /// <summary>Edit "this and following" — truncates the original series the day before Date (or
    /// deletes it outright if nothing remains before Date), then creates a new series starting at
    /// Date with the edited fields. Any per-instance overrides/cancellations dated on/after Date
    /// move to the new series so they keep applying to the same calendar dates.</summary>
    [HttpPost("{id:guid}/split")]
    public async Task<ActionResult<CalendarEventDto>> Split(Guid id, SplitSeriesRequest request)
    {
        var evt = await db.CalendarEvents
            .Include(e => e.Exceptions)
            .FirstOrDefaultAsync(e => e.Id == id && e.HouseholdId == household.HouseholdId);
        if (evt is null) return NotFound();
        if (evt.RecurrenceFrequency is null) return BadRequest(new { error = "not_recurring" });

        var authError = await CheckEditAuthorization(evt);
        if (authError is not null) return authError;

        var splitDate = DateOnly.FromDateTime(request.Date);
        var attendeeIds = new HashSet<Guid>(request.AttendeeUserIds) { evt.OwnerId };

        var newSeries = new CalendarEvent
        {
            Id = Guid.NewGuid(),
            HouseholdId = evt.HouseholdId,
            Title = request.Title,
            Start = request.Start,
            End = request.End,
            Category = request.Category,
            Location = request.Location,
            Notes = request.Notes,
            RecurrenceFrequency = request.RecurrenceFrequency,
            RecurrenceInterval = request.RecurrenceInterval,
            RecurrenceDays = request.RecurrenceDays,
            RecurrenceMonthDay = request.RecurrenceMonthDay,
            RecurrenceWeekOrdinal = request.RecurrenceWeekOrdinal,
            RecurrenceWeekday = request.RecurrenceWeekday,
            RecurrenceEnd = evt.RecurrenceEnd,
            TravelTimeLeaveBy = request.TravelTimeLeaveBy,
            Reminders = request.Reminders,
            OwnerId = evt.OwnerId,
            CreatedAt = DateTime.UtcNow,
            Attendees = attendeeIds.Select(uid => new EventAttendee { UserId = uid }).ToList(),
        };

        foreach (var occurrenceException in evt.Exceptions.Where(x => x.Date >= splitDate).ToList())
        {
            db.EventExceptions.Remove(occurrenceException);
            db.EventExceptions.Add(new EventException
            {
                EventId = newSeries.Id,
                Date = occurrenceException.Date,
                Cancelled = occurrenceException.Cancelled,
                Title = occurrenceException.Title,
                Start = occurrenceException.Start,
                End = occurrenceException.End,
                Location = occurrenceException.Location,
                Notes = occurrenceException.Notes,
                Category = occurrenceException.Category,
            });
        }

        if (splitDate <= DateOnly.FromDateTime(evt.Start))
        {
            db.CalendarEvents.Remove(evt);
        }
        else
        {
            evt.RecurrenceEnd = DateTime.SpecifyKind(splitDate.AddDays(-1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        }

        db.CalendarEvents.Add(newSeries);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return await Reload(newSeries.Id);
    }

    /// <summary>Owners can always edit/delete their own event. Editing someone else's requires
    /// this browser session to have a verified parent PIN.</summary>
    private Task<ActionResult?> CheckEditAuthorization(CalendarEvent evt)
    {
        if (currentUser.UserId == evt.OwnerId) return Task.FromResult<ActionResult?>(null);

        if (!pinElevation.IsElevated(HttpContext.Session.Id))
            return Task.FromResult<ActionResult?>(
                new ObjectResult(new { error = "pin_required" }) { StatusCode = StatusCodes.Status403Forbidden });

        return Task.FromResult<ActionResult?>(null);
    }

    private async Task<ActionResult<CalendarEventDto>> Reload(Guid id)
    {
        var evt = await db.CalendarEvents
            .Include(e => e.Owner)
            .Include(e => e.Attendees).ThenInclude(a => a.User)
            .SingleAsync(e => e.Id == id);
        return Ok(evt.ToDto(currentUser.UserId, null));
    }
}
