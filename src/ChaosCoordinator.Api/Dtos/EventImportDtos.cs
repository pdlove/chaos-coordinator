namespace ChaosCoordinator.Api.Dtos;

/// <summary>Minimal summary of an existing event a candidate might duplicate — enough for the
/// review screen's "might already exist" banner, not a full CalendarEventDto.</summary>
public record ExistingEventSummaryDto(Guid Id, string Title, DateTime Start);

/// <summary>One event as read off the photo/pasted text, with CategoryId/AttendeeUserIds/
/// Reminders already pre-filled from the request's defaults (still editable client-side before
/// confirm). DuplicateOf is set when EventDuplicateDetector found a likely match — the review
/// screen defaults that candidate's include-checkbox to off rather than excluding it outright.
/// TimeZoneId is the zone Start/End were converted from (the request's TimeZoneId, echoed back
/// per-candidate) — the review screen needs it to redisplay/re-edit the wall-clock time correctly
/// and to let the user override just this one candidate's zone.</summary>
public record ExtractedEventCandidateDto(
    string Title,
    DateTime Start,
    DateTime? End,
    string? Location,
    string? Notes,
    Guid CategoryId,
    List<Guid> AttendeeUserIds,
    string? Reminders,
    ExistingEventSummaryDto? DuplicateOf,
    string TimeZoneId
);

public record ExtractEventsResponse(Guid BatchId, List<ExtractedEventCandidateDto> Candidates);

/// <summary>One candidate the user chose to keep, with whatever edits they made in the review
/// screen. No recurrence fields — imported entries are always one-off; make one repeat afterward
/// via the normal edit screen if needed.</summary>
public record ConfirmedEventCandidate(
    string Title,
    DateTime Start,
    DateTime? End,
    Guid CategoryId,
    string? Location,
    string? Notes,
    List<Guid> AttendeeUserIds,
    string? Reminders
);

public record ConfirmEventImportRequest(Guid BatchId, List<ConfirmedEventCandidate> Events);
