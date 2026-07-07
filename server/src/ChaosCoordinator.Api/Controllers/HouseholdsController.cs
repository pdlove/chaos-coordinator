using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/household")]
public class HouseholdsController(AppDbContext db, HouseholdContext household, IHouseholdNotifier notifier) : ControllerBase
{
    private static readonly HashSet<string> ValidTabs = ["calendar", "chores", "shopping", "bills", "food"];
    private const int MaxBottomBarTabs = 4;

    /// <summary>Single-household-per-deployment: there is exactly one row, seeded at startup.</summary>
    [HttpGet]
    public async Task<ActionResult<HouseholdDto>> Get()
    {
        var h = await db.Households.Include(x => x.Users).SingleAsync();
        var users = h.Users.OrderBy(u => u.Order).Select(u => u.ToDto()).ToList();
        return Ok(new HouseholdDto(h.Id, h.Name, users, h.BottomBarTabsList()));
    }

    /// <summary>Not PIN-gated — this is a shared display preference, not a sensitive change.</summary>
    [HttpPatch("bottom-bar-tabs")]
    public async Task<IActionResult> UpdateBottomBarTabs(UpdateBottomBarTabsRequest request)
    {
        var tabs = request.Tabs.Where(t => ValidTabs.Contains(t)).Distinct().Take(MaxBottomBarTabs).ToList();
        if (tabs.Count == 0) return BadRequest(new { error = "at_least_one_tab_required" });

        var h = await db.Households.SingleAsync(x => x.Id == household.HouseholdId);
        h.BottomBarTabs = string.Join(',', tabs);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.HouseholdChanged);
        return Ok(h.BottomBarTabsList());
    }
}
