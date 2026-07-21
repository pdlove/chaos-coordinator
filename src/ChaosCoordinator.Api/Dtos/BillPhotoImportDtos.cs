using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Dtos;

/// <summary>One existing/predicted Bill the scanned photo might belong to, per BillMatcher.
/// IsBestGuess flags the top-scoring candidate for the review screen to visually highlight — it's
/// still just a suggestion, never auto-attached.</summary>
public record BillMatchCandidateDto(
    Guid Id,
    string Title,
    Guid? TemplateId,
    DateOnly DueDate,
    decimal? Amount,
    decimal? AmountMin,
    decimal? AmountMax,
    BillStatus Status,
    bool IsBestGuess
);

public record ExtractBillPhotoResponse(
    Guid BatchId,
    string? ExtractedTitle,
    decimal? ExtractedAmount,
    DateOnly? ExtractedDueDate,
    string? ExtractedAccountNumber,
    List<BillMatchCandidateDto> Matches,
    List<BillTemplateDto> ActiveTemplates
);

/// <summary>Fields for a brand-new one-off bill created directly from the review screen — same
/// shape as CreateOneOffBillRequest, kept separate since it's nested inside
/// ConfirmBillPhotoImportRequest rather than posted on its own.</summary>
public record NewOneOffBillFromPhoto(string Title, Guid ManagedById, DateOnly DueDate, decimal? Amount, decimal? AmountMin, decimal? AmountMax, string? AccountNumber);

/// <summary>Exactly one of ExistingBillId / TemplateId / NewOneOff must be set — the review screen
/// always resolves to picking an existing match, generating this month's instance of a recurring
/// template, or creating a new one-off bill.</summary>
public record ConfirmBillPhotoImportRequest(
    Guid BatchId,
    Guid? ExistingBillId,
    Guid? TemplateId,
    DateOnly? TemplateDueDate,
    NewOneOffBillFromPhoto? NewOneOff
);
