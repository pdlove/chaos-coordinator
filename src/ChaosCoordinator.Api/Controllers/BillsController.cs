using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Api.Services;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/bills")]
public class BillsController(AppDbContext db, HouseholdContext household, BillGenerationService generation, IHouseholdNotifier notifier) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<BillsMonthDto>> Get([FromQuery] string month)
    {
        var parts = month.Split('-');
        var year = int.Parse(parts[0]);
        var monthNum = int.Parse(parts[1]);
        var today = DateOnly.FromDateTime(DateTime.Today);

        await generation.EnsureMonthGeneratedAsync(household.HouseholdId, year, monthNum);

        var current = await db.Bills
            .Include(b => b.ManagedBy)
            .Where(b => b.HouseholdId == household.HouseholdId && b.BillingMonth == month)
            .ToListAsync();

        var prevDate = new DateOnly(year, monthNum, 1).AddDays(-1);
        var prevMonth = $"{prevDate.Year:D4}-{prevDate.Month:D2}";
        var carriedOver = await db.Bills
            .Include(b => b.ManagedBy)
            .Where(b => b.HouseholdId == household.HouseholdId && b.BillingMonth == prevMonth && b.PaidDate == null)
            .ToListAsync();

        await generation.RefreshStatusesAsync(current.Concat(carriedOver), today);

        var dueTotal = current.Sum(b => b.Amount ?? b.AmountMax ?? 0);
        var paidTotal = current.Where(b => b.Status == BillStatus.Paid).Sum(b => b.Amount ?? 0);
        var overdueTotal = current.Concat(carriedOver).Where(b => b.Status == BillStatus.Overdue).Sum(b => b.Amount ?? b.AmountMax ?? 0);

        return Ok(new BillsMonthDto(
            month, dueTotal, paidTotal, overdueTotal,
            carriedOver.OrderBy(b => b.DueDate).Select(b => b.ToDto()).ToList(),
            current.OrderBy(b => b.DueDate).Select(b => b.ToDto()).ToList()
        ));
    }

    [HttpPost("{id:guid}/mark-paid")]
    [RequirePinElevation]
    public async Task<IActionResult> MarkPaid(Guid id)
    {
        var bill = await db.Bills.FirstOrDefaultAsync(b => b.Id == id && b.HouseholdId == household.HouseholdId);
        if (bill is null) return NotFound();

        bill.PaidDate = DateOnly.FromDateTime(DateTime.Today);
        bill.Status = BillStatus.Paid;
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.BillsChanged);
        return NoContent();
    }
}

[ApiController]
[Route("api/bill-templates")]
public class BillTemplatesController(AppDbContext db, HouseholdContext household, IHouseholdNotifier notifier) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<BillTemplateDto>>> Get()
    {
        var templates = await db.BillTemplates
            .Include(t => t.ManagedBy)
            .Where(t => t.HouseholdId == household.HouseholdId)
            .ToListAsync();
        return Ok(templates.Select(t => t.ToDto()).ToList());
    }

    [HttpPost]
    [RequirePinElevation]
    public async Task<IActionResult> Create(CreateBillTemplateRequest request)
    {
        var template = new BillTemplate
        {
            Id = Guid.NewGuid(),
            HouseholdId = household.HouseholdId,
            Title = request.Title,
            ManagedById = request.ManagedById,
            DueDay = request.DueDay,
            Amount = request.Amount,
            AmountMin = request.AmountMin,
            AmountMax = request.AmountMax,
            Active = true,
        };
        db.BillTemplates.Add(template);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.BillsChanged);
        return Ok(template.ToDto());
    }

    [HttpPatch("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Update(Guid id, UpdateBillTemplateRequest request)
    {
        var template = await db.BillTemplates.FirstOrDefaultAsync(t => t.Id == id && t.HouseholdId == household.HouseholdId);
        if (template is null) return NotFound();

        template.Title = request.Title;
        template.ManagedById = request.ManagedById;
        template.DueDay = request.DueDay;
        template.Amount = request.Amount;
        template.AmountMin = request.AmountMin;
        template.AmountMax = request.AmountMax;
        template.Active = request.Active;
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.BillsChanged);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Delete(Guid id)
    {
        var template = await db.BillTemplates.FirstOrDefaultAsync(t => t.Id == id && t.HouseholdId == household.HouseholdId);
        if (template is null) return NotFound();

        db.BillTemplates.Remove(template);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.BillsChanged);
        return NoContent();
    }
}
