namespace ChaosCoordinator.Api.Services;

/// <summary>A bill as read off one or more photos (all pages/photos of the *same* bill — see
/// BillExtractionPrompt) by the vision model. Fields are null when the model couldn't find them
/// rather than guessed, so BillPhotoImportController and the review screen can tell "not on the
/// bill" apart from a wrong reading.</summary>
public record ExtractedBillFields(string? Title, decimal? Amount, DateOnly? DueDate, string? AccountNumber);

public interface IBillExtractionService
{
    /// <summary>images: one or more photos of a single bill (never empty — BillPhotoImportController
    /// rejects an empty submission before this is called). Throws
    /// EventExtractionUnavailableException (shared with the calendar-import flow — same "vision
    /// backend unreachable" meaning) if the model can't be reached at all.</summary>
    Task<ExtractedBillFields> ExtractAsync(IReadOnlyList<byte[]> images, CancellationToken ct);
}
