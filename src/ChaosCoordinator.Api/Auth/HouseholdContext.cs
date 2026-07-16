namespace ChaosCoordinator.Api.Auth;

/// <summary>Holds the single household's id for the lifetime of the process — this is a
/// single-household-per-deployment app (see plan), so there's exactly one row and no need to
/// resolve it per-request. Populated once at startup in Program.cs after migrate+seed.</summary>
public class HouseholdContext
{
    public Guid HouseholdId { get; set; }
}
