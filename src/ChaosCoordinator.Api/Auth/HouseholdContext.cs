using ChaosCoordinator.Data;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Auth;

/// <summary>Resolves the current request's household. Scoped (per-request), not the old
/// process-lifetime singleton — this app now supports multiple independently-registered
/// households (see plan_001.md Workstream 1), so "the household" can no longer be decided once
/// at startup.
///
/// Resolution: from the logged-in user's session, via their HouseholdId.
///
/// TEMPORARY FALLBACK: with no session at all, falls back to the earliest-created household.
/// This keeps the wall display and any other currently-anonymous caller working exactly as
/// before — today there's only one household in practice, so the fallback is a no-op — but it
/// is a real cross-household leak once a second household exists via registration. It must be
/// removed once device-token auth (Workstream 3) gives the wall display its own real identity
/// instead of relying on there being nothing else to resolve.</summary>
public class HouseholdContext(AppDbContext db, ICurrentUserAccessor currentUser)
{
    private Guid? _householdId;

    /// <summary>Synchronous by design — every controller reads this as a plain property today,
    /// and switching all of them to an async accessor is out of scope for this pass. Safe to
    /// block on here: Kestrel has no SynchronizationContext, so there's no deadlock risk, just a
    /// thread-pool thread held for one query, once per request (result is cached after that).</summary>
    public Guid HouseholdId
    {
        get
        {
            if (_householdId is { } cached) return cached;

            var resolved = ResolveAsync().GetAwaiter().GetResult();
            _householdId = resolved;
            return resolved;
        }
    }

    private async Task<Guid> ResolveAsync()
    {
        if (currentUser.UserId is { } userId)
        {
            var householdId = await db.Users
                .Where(u => u.Id == userId)
                .Select(u => u.HouseholdId)
                .SingleOrDefaultAsync();
            if (householdId != Guid.Empty) return householdId;
        }

        var fallback = await db.Households.OrderBy(h => h.CreatedAt).Select(h => h.Id).FirstOrDefaultAsync();
        if (fallback == Guid.Empty)
            throw new InvalidOperationException("Could not resolve a household for this request.");

        return fallback;
    }
}
