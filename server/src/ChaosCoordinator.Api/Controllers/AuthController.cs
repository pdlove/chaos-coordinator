using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, HouseholdContext household, IPinElevationStore pinElevation) : ControllerBase
{
    private static readonly TimeSpan ElevationDuration = TimeSpan.FromMinutes(10);
    private const string RememberCookieName = "cc_remember";

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
                    return Ok(new SessionDto(user.Id, pinElevation.IsElevated(HttpContext.Session.Id)));
                }
            }

            return Ok(new SessionDto(null, false));
        }

        Guid? userId = Guid.TryParse(userIdStr, out var id) ? id : null;
        return Ok(new SessionDto(userId, pinElevation.IsElevated(HttpContext.Session.Id)));
    }

    /// <summary>Authenticates a household member by PIN, establishing their session.
    /// Any role can log in (unlike VerifyPin which is Parents-only and grants edit elevation).
    /// With Remember=true, sets a persistent 30-day cookie so the user stays signed in
    /// across browser restarts.</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId && u.HouseholdId == household.HouseholdId);
        if (user?.PinHash is null || !BCrypt.Net.BCrypt.Verify(request.Pin, user.PinHash))
            return Unauthorized(new { error = "invalid_credentials" });

        HttpContext.Session.SetString(SessionKeys.CurrentUserId, user.Id.ToString());

        if (request.Remember)
        {
            Response.Cookies.Append(RememberCookieName, user.Id.ToString(), new CookieOptions
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

        return Ok(new SessionDto(user.Id, pinElevation.IsElevated(HttpContext.Session.Id)));
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        pinElevation.Clear(HttpContext.Session.Id);
        Response.Cookies.Delete(RememberCookieName);
        return Ok(new SessionDto(null, false));
    }

    /// <summary>Sets "who is using this browser" — kept for internal/wall-display use.
    /// The phone app login flow now uses POST /api/auth/login instead.</summary>
    [HttpPost("select-profile")]
    public async Task<IActionResult> SelectProfile(SelectProfileRequest request)
    {
        var user = await db.Users.FindAsync(request.UserId);
        if (user is null) return NotFound();

        HttpContext.Session.SetString(SessionKeys.CurrentUserId, user.Id.ToString());
        return Ok(new SessionDto(user.Id, pinElevation.IsElevated(HttpContext.Session.Id)));
    }

    /// <summary>Elevates this browser session for ElevationDuration on a correct PIN. Only Parent
    /// role users have a PinHash for elevation; Adults/Children can log in but cannot elevate.</summary>
    [HttpPost("verify-pin")]
    public async Task<IActionResult> VerifyPin(VerifyPinRequest request)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == request.UserId && u.Role == Role.Parent);
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
}
