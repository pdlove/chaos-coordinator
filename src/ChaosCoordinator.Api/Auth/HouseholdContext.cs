using ChaosCoordinator.Data;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Auth;

/// <summary>Resolves the current request's household. Scoped (per-request), not the old
/// process-lifetime singleton — this app now supports multiple independently-registered
/// households (see plan_001.md Workstream 1), so "the household" can no longer be decided once
/// at startup.
///
/// Resolution: from the logged-in user's session, via their HouseholdId. There is no anonymous
/// fallback — a request with no authenticated session throws UnauthenticatedException (mapped to
/// 401 in Program.cs) rather than guessing a household. The wall display's pre-login screens are
/// the one caller that still needs to resolve a household without a session; that requires its
/// own identity (device-token auth, plan_001.md Workstream 1) and is not solved here.</summary>
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

        throw new UnauthenticatedException();
    }
}
