using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Dtos;

public record BillDto(
    Guid Id,
    string Title,
    Guid ManagedById,
    string ManagedByName,
    DateOnly DueDate,
    decimal? Amount,
    decimal? AmountMin,
    decimal? AmountMax,
    BillStatus Status,
    DateOnly? PaidDate
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
    bool Active
);

public record CreateBillTemplateRequest(string Title, Guid ManagedById, int DueDay, decimal? Amount, decimal? AmountMin, decimal? AmountMax);
public record UpdateBillTemplateRequest(string Title, Guid ManagedById, int DueDay, decimal? Amount, decimal? AmountMin, decimal? AmountMax, bool Active);

public static class BillDtoMapping
{
    public static BillDto ToDto(this Bill b) => new(b.Id, b.Title, b.ManagedById, b.ManagedBy?.Name ?? "", b.DueDate, b.Amount, b.AmountMin, b.AmountMax, b.Status, b.PaidDate);

    public static BillTemplateDto ToDto(this BillTemplate t) => new(t.Id, t.Title, t.ManagedById, t.ManagedBy?.Name ?? "", t.DueDay, t.Amount, t.AmountMin, t.AmountMax, t.Active);
}
