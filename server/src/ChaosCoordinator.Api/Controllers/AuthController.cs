using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Dtos;
using ChaosCoordinator.Data;
using ChaosCoordinator.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, IPinElevationStore pinElevation) : ControllerBase
{
    private static readonly TimeSpan ElevationDuration = TimeSpan.FromMinutes(10);

    [HttpGet("session")]
    public IActionResult GetSession()
    {
        var userIdStr = HttpContext.Session.GetString(SessionKeys.CurrentUserId);
        Guid? userId = Guid.TryParse(userIdStr, out var id) ? id : null;
        return Ok(new SessionDto(userId, pinElevation.IsElevated(HttpContext.Session.Id)));
    }

    /// <summary>Sets "who is using this browser" — a UI convenience for defaults (e.g. event
    /// ownership), not a security boundary. No password: picking a household member is enough.</summary>
    [HttpPost("select-profile")]
    public async Task<IActionResult> SelectProfile(SelectProfileRequest request)
    {
        var user = await db.Users.FindAsync(request.UserId);
        if (user is null) return NotFound();

        HttpContext.Session.SetString(SessionKeys.CurrentUserId, user.Id.ToString());
        return Ok(new SessionDto(user.Id, pinElevation.IsElevated(HttpContext.Session.Id)));
    }

    /// <summary>Elevates this browser session for ElevationDuration on a correct PIN. Only Parent
    /// role users have a PinHash; Adults/Children can never elevate.</summary>
    [HttpPost("verify-pin")]
    public async Task<IActionResult> VerifyPin(VerifyPinRequest request)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == request.UserId && u.Role == Role.Parent);
        if (user?.PinHash is null || !BCrypt.Net.BCrypt.Verify(request.Pin, user.PinHash))
        {
            return Unauthorized(new { error = "invalid_pin" });
        }

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
