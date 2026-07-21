using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Services;

/// <summary>Lazily materializes this month's Bill row for every active BillTemplate the first
/// time anyone asks for that month — no background job needed given a household checks bills at
/// most a few times a day. See the plan's "Bills (auto-recurring)" section for the reasoning.</summary>
public class BillGenerationService(AppDbContext db)
{
    public async Task EnsureMonthGeneratedAsync(Guid householdId, int year, int month)
    {
        var billingMonth = $"{year:D4}-{month:D2}";
        var templates = await db.BillTemplates
            .Where(t => t.HouseholdId == householdId && t.Active)
            .ToListAsync();

        var existingTemplateIds = await db.Bills
            .Where(b => b.HouseholdId == householdId && b.BillingMonth == billingMonth)
            .Select(b => b.TemplateId)
            .ToListAsync();

        var missing = templates.Where(t => !existingTemplateIds.Contains(t.Id)).ToList();
        if (missing.Count == 0) return;

        var daysInMonth = DateTime.DaysInMonth(year, month);
        foreach (var template in missing)
        {
            var dueDay = Math.Min(template.DueDay, daysInMonth);
            db.Bills.Add(new Bill
            {
                Id = Guid.NewGuid(),
                HouseholdId = householdId,
                TemplateId = template.Id,
                Title = template.Title,
                ManagedById = template.ManagedById,
                DueDate = new DateOnly(year, month, dueDay),
                Amount = template.Amount,
                AmountMin = template.AmountMin,
                AmountMax = template.AmountMax,
                AccountNumber = template.AccountNumber,
                BillingMonth = billingMonth,
            });
        }

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Another request generated the same month concurrently — the unique index on
            // (TemplateId, BillingMonth) is the real guard here; losing this race is fine.
        }
    }

    public async Task RefreshStatusesAsync(IEnumerable<Bill> bills, DateOnly today)
    {
        var changed = false;
        foreach (var bill in bills)
        {
            var computed = BillStatusCalculator.Compute(bill.DueDate, bill.PaidDate, today);
            if (bill.Status != computed)
            {
                bill.Status = computed;
                changed = true;
            }
        }
        if (changed) await db.SaveChangesAsync();
    }
}
