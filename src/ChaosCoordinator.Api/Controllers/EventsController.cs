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
                && (e.RecurrenceDays == null
                    ? e.Start < to && (e.End ?? e.Start) >= from
                    : e.Start < to && (e.RecurrenceEnd == null || e.RecurrenceEnd >= from)));

        if (category is not null) query = query.Where(e => e.Category == category);

        var events = await query.OrderBy(e => e.Start).ToListAsync();

        var result = new List<CalendarEventDto>();
        foreach (var evt in events)
        {
            if (evt.RecurrenceDays is null)
            {
                result.Add(evt.ToDto(currentUser.UserId, null));
            }
            else
            {
                var cancelled = evt.Exceptions.Select(x => x.Date).ToHashSet();
                foreach (var (instanceStart, _) in RecurrenceExpander.Expand(evt, from, to))
                {
                    if (!cancelled.Contains(DateOnly.FromDateTime(instanceStart)))
                        result.Add(evt.ToDto(currentUser.UserId, instanceStart));
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
            RecurrenceDays = request.RecurrenceDays,
            RecurrenceEnd = request.RecurrenceEnd,
            OwnerId = ownerId,
            CreatedAt = DateTime.UtcNow,
            Attendees = attendeeIds.Select(uid => new EventAttendee { UserId = uid }).ToList(),
        };
        db.CalendarEvents.Add(evt);
        await db.SaveChangesAsync();

        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return await Reload(evt.Id);
    }

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
        evt.RecurrenceDays = request.RecurrenceDays;
        evt.RecurrenceEnd = request.RecurrenceEnd;

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
        if (evt.RecurrenceDays is null) return BadRequest(new { error = "not_recurring" });

        var authError = await CheckEditAuthorization(evt);
        if (authError is not null) return authError;

        var date = DateOnly.FromDateTime(request.Date);
        var exists = await db.EventExceptions.AnyAsync(x => x.EventId == id && x.Date == date);
        if (!exists)
        {
            db.EventExceptions.Add(new EventException { EventId = id, Date = date });
            await db.SaveChangesAsync();
            await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        }

        return NoContent();
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
