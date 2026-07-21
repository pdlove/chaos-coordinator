using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Api.Services;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

/// <summary>multipart/form-data body for POST /extract.</summary>
public class ExtractBillPhotoForm
{
    public List<IFormFile> Images { get; set; } = [];
}

/// <summary>"Scan a bill" flow: POST /extract stores the submitted photo(s) as a BillPhotoBatch
/// immediately (so the source is never lost even if the user abandons the review screen), reads
/// the payee/amount/due-date off them with the local vision model, and returns candidate existing
/// Bills (BillMatcher) plus the household's active BillTemplates so the review screen can offer
/// "attach to one of these" / "generate this month's instance of a recurring bill" / "create a new
/// one-off bill". POST /confirm always requires an explicit user choice among those three — nothing
/// is ever auto-attached.</summary>
[ApiController]
[Route("api/bills/photo-import")]
public class BillPhotoImportController(
    AppDbContext db,
    ICurrentUserAccessor currentUser,
    HouseholdContext household,
    IBillExtractionService extractionService,
    BillGenerationService generation,
    IHouseholdNotifier notifier,
    IWebHostEnvironment env,
    ILogger<BillPhotoImportController> logger
) : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

    // Several full-resolution phone camera photos add up fast — see EventImportController's
    // identical comment/limit for the same reasoning.
    [HttpPost("extract")]
    [RequestSizeLimit(100_000_000)]
    public async Task<ActionResult<ExtractBillPhotoResponse>> Extract([FromForm] ExtractBillPhotoForm form, CancellationToken ct)
    {
        if (currentUser.UserId is not { } ownerId)
            return BadRequest(new { error = "no_profile_selected" });

        if (form.Images.Count == 0)
            return BadRequest(new { error = "no_input" });

        var imageBytes = new List<byte[]>();
        foreach (var file in form.Images)
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return BadRequest(new { error = "unsupported_file_type" });

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms, ct);
            imageBytes.Add(ms.ToArray());
        }

        var uploadsDir = Path.Combine(env.ContentRootPath, "uploads", "bill-photos");
        Directory.CreateDirectory(uploadsDir);

        var batch = new BillPhotoBatch
        {
            Id = Guid.NewGuid(),
            HouseholdId = household.HouseholdId,
            CreatedByUserId = ownerId,
            CreatedAt = DateTime.UtcNow,
        };

        for (var i = 0; i < form.Images.Count; i++)
        {
            var ext = Path.GetExtension(form.Images[i].FileName).ToLowerInvariant();
            var fileName = $"{Guid.NewGuid()}{ext}";
            await System.IO.File.WriteAllBytesAsync(Path.Combine(uploadsDir, fileName), imageBytes[i], ct);
            batch.Images.Add(new BillPhotoImage
            {
                Id = Guid.NewGuid(),
                BatchId = batch.Id,
                ImageUrl = $"/uploads/bill-photos/{fileName}",
                Order = i,
            });
        }

        db.BillPhotoBatches.Add(batch);
        await db.SaveChangesAsync(ct);

        ExtractedBillFields extracted;
        try
        {
            extracted = await extractionService.ExtractAsync(imageBytes, ct);
        }
        catch (EventExtractionUnavailableException ex)
        {
            logger.LogError(ex, "Bill extraction unavailable");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "extraction_not_configured" });
        }

        var referenceDate = extracted.DueDate ?? DateOnly.FromDateTime(DateTime.Today);
        var windowStart = referenceDate.AddDays(-45);
        var windowEnd = referenceDate.AddDays(45);
        var candidateBills = await db.Bills
            .Where(b => b.HouseholdId == household.HouseholdId && b.DueDate >= windowStart && b.DueDate <= windowEnd)
            .ToListAsync(ct);

        var scored = BillMatcher.FindCandidates(extracted.Title, extracted.Amount, extracted.DueDate, candidateBills);
        var matches = scored
            .Select((x, i) => new BillMatchCandidateDto(
                x.Bill.Id, x.Bill.Title, x.Bill.TemplateId, x.Bill.DueDate, x.Bill.Amount, x.Bill.AmountMin, x.Bill.AmountMax, x.Bill.Status,
                IsBestGuess: i == 0 && x.Score >= BillMatcher.BestGuessThreshold))
            .ToList();

        var activeTemplates = await db.BillTemplates
            .Include(t => t.ManagedBy)
            .Where(t => t.HouseholdId == household.HouseholdId && t.Active)
            .ToListAsync(ct);

        return Ok(new ExtractBillPhotoResponse(
            batch.Id, extracted.Title, extracted.Amount, extracted.DueDate, extracted.AccountNumber, matches, activeTemplates.Select(t => t.ToDto()).ToList()
        ));
    }

    [HttpPost("confirm")]
    [RequirePinElevation]
    public async Task<ActionResult<BillDto>> Confirm(ConfirmBillPhotoImportRequest request, CancellationToken ct)
    {
        var targetCount = new[] { request.ExistingBillId is not null, request.TemplateId is not null, request.NewOneOff is not null }.Count(x => x);
        if (targetCount != 1)
            return BadRequest(new { error = "exactly_one_target_required" });

        var batch = await db.BillPhotoBatches
            .FirstOrDefaultAsync(b => b.Id == request.BatchId && b.HouseholdId == household.HouseholdId, ct);
        if (batch is null) return NotFound();
        if (batch.BillId is not null) return Conflict(new { error = "batch_already_attached" });

        Bill? targetBill;
        var today = DateOnly.FromDateTime(DateTime.Today);

        if (request.ExistingBillId is { } existingId)
        {
            targetBill = await db.Bills.FirstOrDefaultAsync(b => b.Id == existingId && b.HouseholdId == household.HouseholdId, ct);
            if (targetBill is null) return NotFound(new { error = "bill_not_found" });
        }
        else if (request.TemplateId is { } templateId)
        {
            if (request.TemplateDueDate is not { } templateDueDate)
                return BadRequest(new { error = "template_due_date_required" });

            var template = await db.BillTemplates.FirstOrDefaultAsync(t => t.Id == templateId && t.HouseholdId == household.HouseholdId, ct);
            if (template is null) return NotFound(new { error = "template_not_found" });

            await generation.EnsureMonthGeneratedAsync(household.HouseholdId, templateDueDate.Year, templateDueDate.Month);
            var billingMonth = $"{templateDueDate.Year:D4}-{templateDueDate.Month:D2}";
            targetBill = await db.Bills.FirstOrDefaultAsync(
                b => b.HouseholdId == household.HouseholdId && b.TemplateId == templateId && b.BillingMonth == billingMonth, ct);
            if (targetBill is null) return NotFound(new { error = "bill_not_found" });
        }
        else
        {
            var newOneOff = request.NewOneOff!;
            targetBill = new Bill
            {
                Id = Guid.NewGuid(),
                HouseholdId = household.HouseholdId,
                TemplateId = null,
                Title = newOneOff.Title,
                ManagedById = newOneOff.ManagedById,
                DueDate = newOneOff.DueDate,
                Amount = newOneOff.Amount,
                AmountMin = newOneOff.AmountMin,
                AmountMax = newOneOff.AmountMax,
                AccountNumber = newOneOff.AccountNumber,
                Status = BillStatusCalculator.Compute(newOneOff.DueDate, null, today),
                BillingMonth = $"{newOneOff.DueDate.Year:D4}-{newOneOff.DueDate.Month:D2}",
            };
            db.Bills.Add(targetBill);
        }

        batch.BillId = targetBill.Id;
        await db.SaveChangesAsync(ct);
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.BillsChanged);

        var updated = await db.Bills
            .Include(b => b.ManagedBy)
            .Include(b => b.PhotoBatches).ThenInclude(pb => pb.Images)
            .FirstAsync(b => b.Id == targetBill.Id, ct);
        return Ok(updated.ToDto());
    }
}
