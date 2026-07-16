using System.Security.Cryptography;
using System.Text;
using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Api.Services;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, HouseholdContext household, IPinElevationStore pinElevation, IEmailSender emailSender) : ControllerBase
{
    private static readonly TimeSpan ElevationDuration = TimeSpan.FromMinutes(10);
    /// <summary>Password login already proves identity as strongly as a PIN — an Adult signed
    /// into their own account for the phone/web app shouldn't hit a redundant PIN prompt for
    /// their own session. Matches the session's own IdleTimeout (Program.cs) and the "remember
    /// me" cookie's MaxAge, so it effectively lasts the whole login. The short ElevationDuration
    /// above stays the PIN-prompt duration for the shared wall-display path only.</summary>
    private static readonly TimeSpan PasswordAuthElevationDuration = TimeSpan.FromDays(30);
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromDays(7);
    private const string RememberCookieName = "cc_remember";
    private const int MaxAdditionalMembers = 6;

    // Mirrors UserEditModal.tsx's COLOR_CHOICES on the frontend.
    private static readonly string[] AvatarColors = ["#FF6B57", "#4C8BF5", "#1FB6A6", "#F2A93B", "#9B6BD9", "#E8607A"];

    [HttpGet("session")]
    public async Task<IActionResult> GetSession()
    {
        var userIdStr = HttpContext.Session.GetString(SessionKeys.CurrentUserId);

        if (userIdStr is null)
        {
            // If there's a "remember me" cookie, restore the session from it
            var remembered = Request.Cookies[RememberCookieName];
            if (remembered is not null && Guid.TryParse(remembered, out var rememberedId))
            {
                var user = await db.Users.FirstOrDefaultAsync(u => u.Id == rememberedId && u.HouseholdId == household.HouseholdId);
                if (user is not null)
                {
                    HttpContext.Session.SetString(SessionKeys.CurrentUserId, user.Id.ToString());
                    // "Remember me" is only ever set by a password-based login (LoginWithPassword,
                    // AcceptInvite) — see EstablishSession — so restoring from it re-grants the
                    // same auto-elevation an Adult got at login, rather than making them hit a PIN
                    // prompt again just because the session cookie expired.
                    if (user.Role == Role.Adult) pinElevation.Elevate(HttpContext.Session.Id, PasswordAuthElevationDuration);
                    return Ok(new SessionDto(user.Id, pinElevation.IsElevated(HttpContext.Session.Id)));
                }
            }

            return Ok(new SessionDto(null, false));
        }

        Guid? userId = Guid.TryParse(userIdStr, out var id) ? id : null;
        return Ok(new SessionDto(userId, pinElevation.IsElevated(HttpContext.Session.Id)));
    }

    /// <summary>Authenticates a household member by PIN, establishing their session. This is the
    /// wall-display login path — the web/app login flow uses POST /api/auth/login-password
    /// instead (see plan_001.md decision #3). Any role can log in this way (unlike VerifyPin,
    /// which is Adults-only and grants edit elevation). With Remember=true, sets a persistent
    /// 30-day cookie so the user stays signed in across browser restarts.</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId && u.HouseholdId == household.HouseholdId);
        if (user?.PinHash is null || !BCrypt.Net.BCrypt.Verify(request.Pin, user.PinHash))
            return Unauthorized(new { error = "invalid_credentials" });

        return EstablishSession(user.Id, request.Remember);
    }

    /// <summary>Email+password login for the web/app — the primary login path for every role
    /// except device/PIN-only Child accounts (which have no password). See decision #3.</summary>
    [HttpPost("login-password")]
    public async Task<IActionResult> LoginWithPassword(PasswordLoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user?.PasswordHash is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { error = "invalid_credentials" });

        return EstablishSession(user.Id, request.Remember, elevateIfAdultRole: user.Role);
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        pinElevation.Clear(HttpContext.Session.Id);
        Response.Cookies.Delete(RememberCookieName);
        return Ok(new SessionDto(null, false));
    }

    /// <summary>Sets "who is using this browser" without proving identity — the wall display's
    /// avatar-tap step. The phone/web app login flow uses POST /api/auth/login-password instead,
    /// which (unlike this) also grants an Adult session-long PIN elevation.</summary>
    [HttpPost("select-profile")]
    public async Task<IActionResult> SelectProfile(SelectProfileRequest request)
    {
        var user = await db.Users.FindAsync(request.UserId);
        if (user is null) return NotFound();

        HttpContext.Session.SetString(SessionKeys.CurrentUserId, user.Id.ToString());
        return Ok(new SessionDto(user.Id, pinElevation.IsElevated(HttpContext.Session.Id)));
    }

    /// <summary>Elevates this browser session for ElevationDuration on a correct PIN. Only Adult
    /// role users have a PinHash for elevation; Other/Children can log in but cannot elevate.</summary>
    [HttpPost("verify-pin")]
    public async Task<IActionResult> VerifyPin(VerifyPinRequest request)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == request.UserId && u.Role == Role.Adult);
        if (user?.PinHash is null || !BCrypt.Net.BCrypt.Verify(request.Pin, user.PinHash))
            return Unauthorized(new { error = "invalid_pin" });

        pinElevation.Elevate(HttpContext.Session.Id, ElevationDuration);
        return Ok(new SessionDto(user.Id, true));
    }

    [HttpPost("exit-edit-mode")]
    public IActionResult ExitEditMode()
    {
        pinElevation.Clear(HttpContext.Session.Id);
        var userIdStr = HttpContext.Session.GetString(SessionKeys.CurrentUserId);
        Guid? userId = Guid.TryParse(userIdStr, out var id) ? id : null;
        return Ok(new SessionDto(userId, false));
    }

    /// <summary>Family registration: creates a new household, its first adult (email+password,
    /// unverified until they click the link this sends), and up to 6 more members. Additional
    /// Adult/Other members get an invite email to set their own password (decision #6); Child
    /// members get no credentials here — an Adult sets their PIN later from Settings.</summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterHouseholdRequest request)
    {
        var familyName = request.FamilyName.Trim();
        var firstAdultName = request.FirstAdultName.Trim();
        var firstAdultEmail = request.FirstAdultEmail.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(familyName))
            return BadRequest(new { error = "family_name_required" });
        if (string.IsNullOrWhiteSpace(firstAdultName))
            return BadRequest(new { error = "first_adult_name_required" });
        if (!IsValidEmail(firstAdultEmail))
            return BadRequest(new { error = "invalid_email", field = "firstAdultEmail" });
        if (request.FirstAdultPassword.Length < 8)
            return BadRequest(new { error = "password_too_short" });
        if (request.AdditionalMembers.Count > MaxAdditionalMembers)
            return BadRequest(new { error = "too_many_members", max = MaxAdditionalMembers });

        var emailsInRequest = new HashSet<string> { firstAdultEmail };
        var normalizedMembers = new List<(string Name, Role Role, string? Email)>();
        foreach (var m in request.AdditionalMembers)
        {
            var name = m.Name.Trim();
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { error = "member_name_required" });

            if (m.Role == Role.Child)
            {
                normalizedMembers.Add((name, m.Role, null));
                continue;
            }

            var email = m.Email?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email) || !IsValidEmail(email))
                return BadRequest(new { error = "invalid_email", field = "member_email", member = name });
            if (!emailsInRequest.Add(email))
                return BadRequest(new { error = "duplicate_email", email });

            normalizedMembers.Add((name, m.Role, email));
        }

        var alreadyRegistered = await db.Users
            .Where(u => u.Email != null && emailsInRequest.Contains(u.Email!))
            .Select(u => u.Email!)
            .ToListAsync();
        if (alreadyRegistered.Count > 0)
            return Conflict(new { error = "email_already_registered", emails = alreadyRegistered });

        var now = DateTime.UtcNow;
        var newHousehold = new Household { Id = Guid.NewGuid(), Name = familyName, CreatedAt = now };
        db.Households.Add(newHousehold);

        var firstAdult = new User
        {
            Id = Guid.NewGuid(),
            HouseholdId = newHousehold.Id,
            Name = firstAdultName,
            Initials = DeriveInitials(firstAdultName),
            Color = AvatarColors[0],
            Role = Role.Adult,
            Order = 0,
            Email = firstAdultEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.FirstAdultPassword),
        };
        db.Users.Add(firstAdult);

        var (verifyRaw, verifyHash) = GenerateToken();
        db.AccountTokens.Add(new AccountToken
        {
            Id = Guid.NewGuid(),
            UserId = firstAdult.Id,
            TokenHash = verifyHash,
            Purpose = AccountTokenPurpose.EmailVerification,
            ExpiresAt = now + TokenLifetime,
            CreatedAt = now,
        });

        var order = 1;
        var invites = new List<(string Name, string Email, string RawToken)>();
        foreach (var (name, role, email) in normalizedMembers)
        {
            var member = new User
            {
                Id = Guid.NewGuid(),
                HouseholdId = newHousehold.Id,
                Name = name,
                Initials = DeriveInitials(name),
                Color = AvatarColors[order % AvatarColors.Length],
                Role = role,
                Order = order,
                Email = email,
            };
            db.Users.Add(member);

            if (email is not null)
            {
                var (rawToken, tokenHash) = GenerateToken();
                db.AccountTokens.Add(new AccountToken
                {
                    Id = Guid.NewGuid(),
                    UserId = member.Id,
                    TokenHash = tokenHash,
                    Purpose = AccountTokenPurpose.Invite,
                    ExpiresAt = now + TokenLifetime,
                    CreatedAt = now,
                });
                invites.Add((name, email, rawToken));
            }

            order++;
        }

        await db.SaveChangesAsync();

        var appUrl = (Environment.GetEnvironmentVariable("APP_URL") ?? "http://localhost:5173").TrimEnd('/');
        await emailSender.SendEmailVerificationAsync(firstAdultEmail, firstAdultName, $"{appUrl}/verify-email?token={verifyRaw}");
        foreach (var (name, email, rawToken) in invites)
            await emailSender.SendInviteAsync(email, name, familyName, $"{appUrl}/accept-invite?token={rawToken}");

        return Ok(new RegisterResponse(newHousehold.Id, firstAdult.Id));
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail(VerifyEmailRequest request)
    {
        var token = await FindValidTokenAsync(request.Token, AccountTokenPurpose.EmailVerification);
        if (token is null) return BadRequest(new { error = "invalid_or_expired_token" });

        token.UsedAt = DateTime.UtcNow;
        token.User!.EmailVerifiedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await emailSender.SendWelcomeAsync(token.User.Email!, token.User.Name, token.User.Household!.Name);
        return Ok();
    }

    /// <summary>Invited Adult/Other members land here from their invite email to set their own
    /// password — the registering adult never sets or sees it (decision #6).</summary>
    [HttpPost("accept-invite")]
    public async Task<IActionResult> AcceptInvite(AcceptInviteRequest request)
    {
        if (request.Password.Length < 8)
            return BadRequest(new { error = "password_too_short" });

        var token = await FindValidTokenAsync(request.Token, AccountTokenPurpose.Invite);
        if (token is null) return BadRequest(new { error = "invalid_or_expired_token" });

        token.UsedAt = DateTime.UtcNow;
        token.User!.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        token.User.EmailVerifiedAt = DateTime.UtcNow; // clicking the invite link proves the address
        await db.SaveChangesAsync();

        await emailSender.SendWelcomeAsync(token.User.Email!, token.User.Name, token.User.Household!.Name);
        return EstablishSession(token.User.Id, remember: false, elevateIfAdultRole: token.User.Role);
    }

    /// <summary>elevateIfAdultRole: pass the user's Role only for password-proven logins
    /// (LoginWithPassword, AcceptInvite) — an Adult gets this session auto-elevated so they never
    /// hit a PIN prompt for their own account. Leave null for the PIN-based wall-display path
    /// (Login), which must keep requiring a separate VerifyPin per sensitive action since that
    /// session isn't tied to one specific person.</summary>
    private IActionResult EstablishSession(Guid userId, bool remember, Role? elevateIfAdultRole = null)
    {
        HttpContext.Session.SetString(SessionKeys.CurrentUserId, userId.ToString());

        if (elevateIfAdultRole == Role.Adult)
        {
            pinElevation.Elevate(HttpContext.Session.Id, PasswordAuthElevationDuration);
        }

        if (remember)
        {
            Response.Cookies.Append(RememberCookieName, userId.ToString(), new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                MaxAge = TimeSpan.FromDays(30),
            });
        }
        else
        {
            Response.Cookies.Delete(RememberCookieName);
        }

        return Ok(new SessionDto(userId, pinElevation.IsElevated(HttpContext.Session.Id)));
    }

    private async Task<AccountToken?> FindValidTokenAsync(string rawToken, AccountTokenPurpose purpose)
    {
        if (string.IsNullOrEmpty(rawToken)) return null;

        var hash = HashToken(rawToken);
        var token = await db.AccountTokens
            .Include(t => t.User)
            .ThenInclude(u => u!.Household)
            .FirstOrDefaultAsync(t => t.TokenHash == hash && t.Purpose == purpose);

        if (token is null || token.UsedAt is not null || token.ExpiresAt < DateTime.UtcNow) return null;
        return token;
    }

    private static string HashToken(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));

    private static (string RawToken, string TokenHash) GenerateToken()
    {
        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
        return (raw, HashToken(raw));
    }

    private static string DeriveInitials(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2) return $"{parts[0][0]}{parts[1][0]}".ToUpperInvariant();
        if (parts.Length == 1) return parts[0].Length >= 2 ? parts[0][..2].ToUpperInvariant() : parts[0].ToUpperInvariant();
        return "??";
    }

    private static bool IsValidEmail(string email)
    {
        try { return new System.Net.Mail.MailAddress(email).Address == email; }
        catch { return false; }
    }
}
