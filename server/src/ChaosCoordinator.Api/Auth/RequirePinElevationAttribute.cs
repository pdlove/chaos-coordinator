using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ChaosCoordinator.Api.Auth;

/// <summary>Blocks an action unless this browser session has recently verified a parent PIN
/// (see AuthController.VerifyPin). Applied to sensitive endpoints: chore-group settings, bill
/// management, deleting/editing others' calendar events, household member management, etc.</summary>
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
