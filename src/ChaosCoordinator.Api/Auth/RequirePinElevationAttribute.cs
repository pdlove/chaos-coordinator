using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ChaosCoordinator.Api.Auth;

/// <summary>Blocks an action unless this browser session is elevated. Applied to sensitive
/// endpoints: chore-group settings, bill management, deleting/editing others' calendar events,
/// household member management, etc. Elevation comes from one of two places: a wall-display
/// session verifying a PIN (AuthController.VerifyPin, short-lived), or an Adult logging into
/// their own account on the phone/web app (AuthController.EstablishSession, session-long — a
/// password login already proves identity, so that session never needs a separate PIN prompt).</summary>
public class RequirePinElevationAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var store = context.HttpContext.RequestServices.GetRequiredService<IPinElevationStore>();
        var sessionId = context.HttpContext.Session.Id;

        if (!store.IsElevated(sessionId))
        {
            context.Result = new ObjectResult(new { error = "pin_required" }) { StatusCode = StatusCodes.Status403Forbidden };
            return;
        }

        await next();
    }
}
