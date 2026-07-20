using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Api.Services;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

/// <summary>multipart/form-data body for POST /extract — a plain class (not a Dtos record) since
/// it carries IFormFile, which only makes sense as a form-bound request, never a JSON one.</summary>
public class ExtractEventsForm
{
    public List<IFormFile> Images { get; set; } = [];
    public string? Text { get; set; }
    public Guid DefaultCategoryId { get; set; }
    public List<Guid> DefaultAttendeeUserIds { get; set; } = [];
    public string? DefaultReminders { get; set; }

    /// <summary>IANA timezone id (e.g. "America/New_York") the date/time on the photo(s)/text
    /// should be interpreted in — the vision model only reads wall-clock digits off the image, it
    /// has no way to know what zone they're in. Defaults to the submitting browser's own zone,
    /// which is correct unless the photo is of a calendar from somewhere else (e.g. a trip
    /// itinerary), in which case the client lets the user override it.</summary>
    public string TimeZoneId { get; set; } = "UTC";
}

/// <summary>"Create events from a photo" import flow: POST /extract stores the submitted image(s)/
/// text as an EventImportBatch immediately (so the source is never lost, even if the user
/// abandons the review screen) and returns proposed events read off them by the local Ollama
/// vision model (see IEventExtractionService), flagged for likely duplicates against existing
/// household events. POST /confirm turns the user's edited/pruned selection into real
/// CalendarEvents linked back to that batch.</summary>
[ApiController]
[Route("api/events/import")]
public class EventImportController(
    AppDbContext db,
    ICurrentUserAccessor currentUser,
    HouseholdContext household,
    IEventExtractionService extractionService,
    IHouseholdNotifier notifier,
    IWebHostEnvironment env,
    ILogger<EventImportController> logger
) : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

    // Several full-resolution phone camera photos add up fast (modern phones routinely produce
    // 5-10MB+ JPEGs each) — 100MB gives real headroom for a multi-photo submission. A rejection
    // at this limit (or Kestrel's own 30MB default, if this were ever removed) returns a 413
    // without the request ever reaching this method's body, so nothing gets logged here either.
    [HttpPost("extract")]
    [RequestSizeLimit(100_000_000)]
    public async Task<ActionResult<ExtractEventsResponse>> Extract([FromForm] ExtractEventsForm form, CancellationToken ct)
    {
        if (currentUser.UserId is not { } ownerId)
            return BadRequest(new { error = "no_profile_selected" });

        if (form.Images.Count == 0 && string.IsNullOrWhiteSpace(form.Text))
            return BadRequest(new { error = "no_input" });

        TimeZoneInfo timeZone;
        try
        {
            timeZone = TimeZoneInfo.FindSystemTimeZoneById(form.TimeZoneId);
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return BadRequest(new { error = "invalid_timezone" });
        }

        // Validate + read every image up front, before anything is persisted, so one bad file
        // doesn't leave a half-populated batch behind.
        var imageBytes = new List<byte[]>();
        foreach (var file in form.Images)
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return BadRequest(new { error = "unsupported_file_type" });

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms, ct);
            imageBytes.Add(ms.ToArray());
        }

        // Stored immediately and independent of whether the user goes on to confirm anything —
        // the source image must never be lost just because they abandon the review screen.
        var uploadsDir = Path.Combine(env.ContentRootPath, "uploads", "event-imports");
        Directory.CreateDirectory(uploadsDir);

        var batch = new EventImportBatch
        {
            Id = Guid.NewGuid(),
            HouseholdId = household.HouseholdId,
            CreatedByUserId = ownerId,
            CreatedAt = DateTime.UtcNow,
            PastedText = string.IsNullOrWhiteSpace(form.Text) ? null : form.Text,
        };

        for (var i = 0; i < form.Images.Count; i++)
        {
            var ext = Path.GetExtension(form.Images[i].FileName).ToLowerInvariant();
            var fileName = $"{Guid.NewGuid()}{ext}";
            await System.IO.File.WriteAllBytesAsync(Path.Combine(uploadsDir, fileName), imageBytes[i], ct);
            batch.Images.Add(new EventImportImage
            {
                Id = Guid.NewGuid(),
                BatchId = batch.Id,
                ImageUrl = $"/uploads/event-imports/{fileName}",
                Order = i,
            });
        }

        db.EventImportBatches.Add(batch);
        await db.SaveChangesAsync(ct);

        List<ExtractedEventFields> extracted;
        try
        {
            extracted = await extractionService.ExtractAsync(imageBytes, form.Text, ct);
        }
        catch (EventExtractionUnavailableException ex)
        {
            logger.LogError(ex, "Event extraction unavailable");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "extraction_not_configured" });
        }

        if (extracted.Count == 0)
            return Ok(new ExtractEventsResponse(batch.Id, []));

        // The vision model only ever reads wall-clock digits off the photo/text — it has no
        // concept of a timezone. Those naive digits mean the given instant in `timeZone` (the
        // zone the client says the source calendar is in), not UTC, so they must be converted
        // rather than just relabeled.
        DateTime ToUtc(DateTime naiveLocal) => TimeZoneInfo.ConvertTimeToUtc(naiveLocal, timeZone);

        // Widen the existing-events lookup a day on either side of the extracted range so
        // EventDuplicateDetector can match candidates whose date the model read slightly off.
        var minDate = ToUtc(extracted.Min(e => e.Date).AddDays(-1).ToDateTime(TimeOnly.MinValue));
        var maxDate = ToUtc(extracted.Max(e => e.Date).AddDays(2).ToDateTime(TimeOnly.MinValue));
        var existingEvents = await db.CalendarEvents
            .Where(e => e.HouseholdId == household.HouseholdId
                && (e.RecurrenceFrequency == null
                    ? e.Start < maxDate && (e.End ?? e.Start) >= minDate
                    : e.Start < maxDate && (e.RecurrenceEnd == null || e.RecurrenceEnd >= minDate)))
            .ToListAsync(ct);

        var candidates = extracted.Select(e =>
        {
            var start = ToUtc(e.StartTime.HasValue ? e.Date.ToDateTime(e.StartTime.Value) : e.Date.ToDateTime(TimeOnly.MinValue));
            var end = e.EndTime.HasValue ? ToUtc(e.Date.ToDateTime(e.EndTime.Value)) : (DateTime?)null;
            var duplicate = EventDuplicateDetector.FindDuplicate(e.Title, e.Date, existingEvents);

            return new ExtractedEventCandidateDto(
                e.Title, start, end, e.Location, e.Notes,
                form.DefaultCategoryId, form.DefaultAttendeeUserIds, form.DefaultReminders,
                duplicate is null ? null : new ExistingEventSummaryDto(duplicate.EventId, duplicate.Title, duplicate.Start),
                timeZone.Id
            );
        }).ToList();

        return Ok(new ExtractEventsResponse(batch.Id, candidates));
    }

    [HttpPost("confirm")]
    public async Task<ActionResult<List<CalendarEventDto>>> Confirm(ConfirmEventImportRequest request)
    {
        if (currentUser.UserId is not { } ownerId)
            return BadRequest(new { error = "no_profile_selected" });

        var batch = await db.EventImportBatches
            .FirstOrDefaultAsync(b => b.Id == request.BatchId && b.HouseholdId == household.HouseholdId);
        if (batch is null) return NotFound();

        var createdIds = new List<Guid>();
        foreach (var candidate in request.Events)
        {
            var attendeeIds = new HashSet<Guid>(candidate.AttendeeUserIds) { ownerId };
            var evt = new CalendarEvent
            {
                Id = Guid.NewGuid(),
                HouseholdId = household.HouseholdId,
                Title = candidate.Title,
                Start = candidate.Start,
                End = candidate.End,
                CategoryId = candidate.CategoryId,
                Location = candidate.Location,
                Notes = candidate.Notes,
                Reminders = candidate.Reminders,
                OwnerId = ownerId,
                CreatedAt = DateTime.UtcNow,
                ImportBatchId = batch.Id,
                Attendees = attendeeIds.Select(uid => new EventAttendee { UserId = uid }).ToList(),
            };
            db.CalendarEvents.Add(evt);
            createdIds.Add(evt.Id);
        }

        await db.SaveChangesAsync();
        if (createdIds.Count > 0)
            await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.CalendarChanged);

        var created = await db.CalendarEvents
            .Include(e => e.Owner)
            .Include(e => e.Category)
            .Include(e => e.Attendees).ThenInclude(a => a.User)
            .Include(e => e.ImportBatch).ThenInclude(b => b!.Images)
            .Where(e => createdIds.Contains(e.Id))
            .ToListAsync();

        return Ok(created.Select(e => e.ToDto(currentUser.UserId, null)).ToList());
    }
}
