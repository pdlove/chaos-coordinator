namespace ChaosCoordinator.Domain;

/// <summary>The shared claimable task pool ("Household" tab) — distinct from recurring Chores.</summary>
public class HouseholdTask
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public string Title { get; set; } = "";
    public string? Note { get; set; }
    public HouseholdTaskStatus Status { get; set; } = HouseholdTaskStatus.Unclaimed;

    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public ICollection<TaskClaim> Claims { get; set; } = new List<TaskClaim>();
}

/// <summary>Join table — supports "claimed together" (multiple claimers on one task).</summary>
public class TaskClaim
{
    public Guid TaskId { get; set; }
    public HouseholdTask? Task { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }
}
