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
[Route("api/users")]
public class UsersController(
    AppDbContext db,
    HouseholdContext household,
    IHouseholdNotifier notifier,
    IEmailSender emailSender
) : ControllerBase
{
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromDays(7);


    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> Get()
    {
        var users = await db.Users.Where(u => u.HouseholdId == household.HouseholdId).OrderBy(u => u.Order).ToListAsync();
        return Ok(users.Select(u => u.ToDto()).ToList());
    }

    [HttpPost]
    [RequirePinElevation]
    public async Task<IActionResult> Create(CreateUserRequest request)
    {
        var (email, emailError) = await NormalizeEmailAsync(request.Email, excludeUserId: null);
        if (emailError is not null) return emailError;

        var user = new User
        {
            Id = Guid.NewGuid(),
            HouseholdId = household.HouseholdId,
            Name = request.Name,
            Initials = request.Initials,
            Color = request.Color,
            Role = request.Role,
            Order = request.Order,
            Email = email,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.HouseholdChanged);
        return Ok(user.ToDto());
    }

    [HttpPatch("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Update(Guid id, UpdateUserRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.HouseholdId == household.HouseholdId);
        if (user is null) return NotFound();

        var (email, emailError) = await NormalizeEmailAsync(request.Email, excludeUserId: id);
        if (emailError is not null) return emailError;

        user.Name = request.Name;
        user.Initials = request.Initials;
        user.Color = request.Color;
        user.Role = request.Role;
        user.Order = request.Order;
        user.Email = email;

        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.HouseholdChanged);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [RequirePinElevation]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.HouseholdId == household.HouseholdId);
        if (user is null) return NotFound();

        db.Users.Remove(user);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.HouseholdChanged);
        return NoContent();
    }

    /// <summary>Sets/resets any user's login PIN (wall-display auth). PIN-gated — requires an
    /// already-elevated session. Any role can have a login PIN; only Adults also get edit
    /// elevation via VerifyPin/password login.</summary>
    [HttpPost("{id:guid}/pin")]
    [RequirePinElevation]
    public async Task<IActionResult> SetPin(Guid id, SetPinRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.HouseholdId == household.HouseholdId);
        if (user is null) return NotFound();

        user.PinHash = BCrypt.Net.BCrypt.HashPassword(request.Pin);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Sends a password-setup link to a user who already has an email on file — the same
    /// AccountTokenPurpose.Invite flow used for additional members at registration (decision #6),
    /// now triggerable on demand. Doubles as "welcome" (never verified/no password yet) and
    /// "password reset" (already verified) — AcceptInvite overwrites PasswordHash regardless, so
    /// there's no meaningful difference server-side, only in the email copy IEmailSender sends.</summary>
    [HttpPost("{id:guid}/send-account-email")]
    [RequirePinElevation]
    public async Task<IActionResult> SendAccountEmail(Guid id)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.HouseholdId == household.HouseholdId);
        if (user is null) return NotFound();
        if (user.Email is null) return BadRequest(new { error = "no_email_set" });

        var householdName = await db.Households
            .Where(h => h.Id == household.HouseholdId)
            .Select(h => h.Name)
            .SingleAsync();

        var (rawToken, tokenHash) = AccountTokens.Generate();
        db.AccountTokens.Add(new AccountToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = tokenHash,
            Purpose = AccountTokenPurpose.Invite,
            ExpiresAt = DateTime.UtcNow + TokenLifetime,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var appUrl = (Environment.GetEnvironmentVariable("APP_URL") ?? "http://localhost:5173").TrimEnd('/');
        await emailSender.SendInviteAsync(user.Email, user.Name, householdName, $"{appUrl}/accept-invite?token={rawToken}");
        return NoContent();
    }

    private async Task<(string? Email, IActionResult? Error)> NormalizeEmailAsync(string? rawEmail, Guid? excludeUserId)
    {
        if (string.IsNullOrWhiteSpace(rawEmail)) return (null, null);

        var email = rawEmail.Trim().ToLowerInvariant();
        if (!AccountTokens.IsValidEmail(email))
            return (null, BadRequest(new { error = "invalid_email" }));

        var taken = await db.Users.AnyAsync(u => u.Email == email && u.Id != (excludeUserId ?? Guid.Empty));
        if (taken)
            return (null, Conflict(new { error = "email_already_registered" }));

        return (email, null);
    }

    [HttpGet("{id:guid}/dietary-tags")]
    public async Task<ActionResult<List<DietaryTagDto>>> GetDietaryTags(Guid id)
    {
        var tags = await db.DietaryTags.Where(t => t.UserId == id && t.User!.HouseholdId == household.HouseholdId).ToListAsync();
        return Ok(tags.Select(t => new DietaryTagDto(t.Id, t.Tag)).ToList());
    }

    [HttpPost("{id:guid}/dietary-tags")]
    public async Task<IActionResult> AddDietaryTag(Guid id, CreateDietaryTagRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.HouseholdId == household.HouseholdId);
        if (user is null) return NotFound();

        var tag = new DietaryTag { Id = Guid.NewGuid(), UserId = id, Tag = request.Tag };
        db.DietaryTags.Add(tag);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.HouseholdChanged);
        return Ok(new DietaryTagDto(tag.Id, tag.Tag));
    }

    [HttpDelete("{id:guid}/dietary-tags/{tagId:guid}")]
    public async Task<IActionResult> DeleteDietaryTag(Guid id, Guid tagId)
    {
        var tag = await db.DietaryTags.FirstOrDefaultAsync(t => t.Id == tagId && t.UserId == id);
        if (tag is null) return NotFound();

        db.DietaryTags.Remove(tag);
        await db.SaveChangesAsync();
        await notifier.NotifyAsync(household.HouseholdId, RealtimeEvents.HouseholdChanged);
        return NoContent();
    }
}
