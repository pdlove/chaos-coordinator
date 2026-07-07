namespace ChaosCoordinator.Domain;

/// <summary>A recurring bill definition (e.g. "Mortgage, due the 1st, managed by Paul") from which
/// monthly Bill instances are lazily generated on read.</summary>
public class BillTemplate
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public string Title { get; set; } = "";

    public Guid ManagedById { get; set; }
    public User? ManagedBy { get; set; }

    /// <summary>1-31, clamped to the actual month length when generating an instance.</summary>
    public int DueDay { get; set; }

    public decimal? Amount { get; set; }
    public decimal? AmountMin { get; set; }
    public decimal? AmountMax { get; set; }

    public bool Active { get; set; } = true;

    public ICollection<Bill> Bills { get; set; } = new List<Bill>();
}

/// <summary>A single month's instance of a bill — either generated from a BillTemplate or entered as a one-off (TemplateId null).</summary>
public class Bill
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public Guid? TemplateId { get; set; }
    public BillTemplate? Template { get; set; }

    public string Title { get; set; } = "";

    public Guid ManagedById { get; set; }
    public User? ManagedBy { get; set; }

    public DateOnly DueDate { get; set; }

    public decimal? Amount { get; set; }
    public decimal? AmountMin { get; set; }
    public decimal? AmountMax { get; set; }

    public BillStatus Status { get; set; } = BillStatus.Upcoming;
    public DateOnly? PaidDate { get; set; }

    /// <summary>"2026-07" — the month this instance belongs to, for grouping + carry-over detection.</summary>
    public string BillingMonth { get; set; } = "";
}
