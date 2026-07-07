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
    public async Task<ActionResult<List<CalendarEventDto>>> Get([FromQuery] DateTime from, [FromQuery] DateTime to, [FromQuery] EventCategory? category)
    {
        var query = db.CalendarEvents
            .Include(e => e.Owner)
            .Include(e => e.Attendees).ThenInclude(a => a.User)
            .Where(e => e.HouseholdId == household.HouseholdId && e.Start < to && (e.End ?? e.Start) >= from);

        if (category is not null) query = query.Where(e => e.Category == category);

        var events = await query.OrderBy(e => e.Start).ToListAsync();
        return Ok(events.Select(e => e.ToDto(currentUser.UserId)).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<CalendarEventDto>> Create(CreateEventRequest request)
    {
        if (currentUser.UserId is not { } ownerId)
        {
            return BadRequest(new { error = "no_profile_selected" });
        }

        var attendeeIds = new HashSet<Guid>(request.AttendeeUserIds) { ownerId };

        var evt = new CalendarEvent
        {
            Id = Guid.NewGuid(),
            HouseholdId = household.HouseholdId,
            Title = request.Title,
            Start = request.Start,
            End = request.End,
            Category = request.Category,
            Notes = request.Notes,
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
        var evt = await db.CalendarEvents.Include(e => e.Attendees).FirstOrDefaultAsync(e => e.Id == id && e.HouseholdId == household.HouseholdId);
        if (evt is null) return NotFound();

        var authError = await CheckEditAuthorization(evt);
        if (authError is not null) return authError;

        evt.Title = request.Title;
        evt.Start = request.Start;
        evt.End = request.End;
        evt.Category = request.Category;
        evt.Notes = request.Notes;

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
        var evt = await db.CalendarEvents.FirstOrDefaultAsync(e => e.Id == id && e.HouseholdId == household.HouseholdId);
        if (evt is null) return NotFound();

        var authError = await CheckEditAuthorization(evt);
        if (authError is not null) return authError;

        db.CalendarEvents.Remove(evt);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);
        return NoContent();
    }

    /// <summary>Owners can always edit/delete their own event. Editing someone else's requires
    /// this browser session to have a verified parent PIN (see RequirePinElevationAttribute —
    /// applied inline here rather than as an attribute, since it only applies conditionally).</summary>
    private Task<ActionResult?> CheckEditAuthorization(CalendarEvent evt)
    {
        if (currentUser.UserId == evt.OwnerId) return Task.FromResult<ActionResult?>(null);

        if (!pinElevation.IsElevated(HttpContext.Session.Id))
        {
            return Task.FromResult<ActionResult?>(new ObjectResult(new { error = "pin_required" }) { StatusCode = StatusCodes.Status403Forbidden });
        }

        return Task.FromResult<ActionResult?>(null);
    }

    private async Task<ActionResult<CalendarEventDto>> Reload(Guid id)
    {
        var evt = await db.CalendarEvents
            .Include(e => e.Owner)
            .Include(e => e.Attendees).ThenInclude(a => a.User)
            .SingleAsync(e => e.Id == id);
        return Ok(evt.ToDto(currentUser.UserId));
    }
}
