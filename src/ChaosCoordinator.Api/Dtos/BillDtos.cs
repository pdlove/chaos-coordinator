using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Dtos;

public record BillPhotoDto(Guid Id, string Url, int Order);

public record BillDto(
    Guid Id,
    string Title,
    Guid? TemplateId,
    Guid ManagedById,
    string ManagedByName,
    DateOnly DueDate,
    decimal? Amount,
    decimal? AmountMin,
    decimal? AmountMax,
    string? AccountNumber,
    BillStatus Status,
    DateOnly? PaidDate,
    string? ConfirmationNumber,
    List<BillPhotoDto> Photos
);

public record BillsMonthDto(
    string BillingMonth,
    decimal DueTotal,
    decimal PaidTotal,
    decimal OverdueTotal,
    List<BillDto> CarriedOver,
    List<BillDto> Current
);

public record BillTemplateDto(
    Guid Id,
    string Title,
    Guid ManagedById,
    string ManagedByName,
    int DueDay,
    decimal? Amount,
    decimal? AmountMin,
    decimal? AmountMax,
    string? AccountNumber,
    bool Active
);

public record CreateBillTemplateRequest(string Title, Guid ManagedById, int DueDay, decimal? Amount, decimal? AmountMin, decimal? AmountMax, string? AccountNumber);
public record UpdateBillTemplateRequest(string Title, Guid ManagedById, int DueDay, decimal? Amount, decimal? AmountMin, decimal? AmountMax, string? AccountNumber, bool Active);

/// <summary>Backs the "+ Add one-off bill" button on the Bills page's One-off tab — a Bill entered
/// directly with no BillTemplate behind it.</summary>
public record CreateOneOffBillRequest(string Title, Guid ManagedById, DateOnly DueDate, decimal? Amount, decimal? AmountMin, decimal? AmountMax, string? AccountNumber);

/// <summary>Body for POST /api/bills/{id}/mark-paid — ConfirmationNumber is always optional, never
/// required to mark something paid.</summary>
public record MarkBillPaidRequest(string? ConfirmationNumber);

public static class BillDtoMapping
{
    public static BillDto ToDto(this Bill b) => new(
        b.Id, b.Title, b.TemplateId, b.ManagedById, b.ManagedBy?.Name ?? "", b.DueDate, b.Amount, b.AmountMin, b.AmountMax, b.AccountNumber,
        b.Status, b.PaidDate, b.ConfirmationNumber,
        b.PhotoBatches
            .SelectMany(pb => pb.Images)
            .OrderBy(img => img.Order)
            .Select(img => new BillPhotoDto(img.Id, img.ImageUrl, img.Order))
            .ToList()
    );

    public static BillTemplateDto ToDto(this BillTemplate t) =>
        new(t.Id, t.Title, t.ManagedById, t.ManagedBy?.Name ?? "", t.DueDay, t.Amount, t.AmountMin, t.AmountMax, t.AccountNumber, t.Active);
}
