namespace ChaosCoordinator.Api.Services;

/// <summary>One event as read off a photo/pasted text by the vision model — no household-specific
/// fields (category/attendees/reminders) yet; EventImportController fills those in from the
/// request's defaults before returning candidates to the client.</summary>
public record ExtractedEventFields(
    string Title,
    DateOnly Date,
    TimeOnly? StartTime,
    TimeOnly? EndTime,
    string? Location,
    string? Notes
);

public class EventExtractionUnavailableException(string message, Exception? inner = null) : Exception(message, inner);

public interface IEventExtractionService
{
    /// <summary>Reads calendar-event-shaped entries out of zero or more images and/or pasted
    /// text. At least one of images/pastedText should be non-empty. Throws
    /// EventExtractionUnavailableException if the model can't be reached at all (vs. returning an
    /// empty list, which means "reached it, found nothing").</summary>
    Task<List<ExtractedEventFields>> ExtractAsync(
        IReadOnlyList<byte[]> images, string? pastedText, CancellationToken ct);
}
