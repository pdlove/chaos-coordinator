namespace ChaosCoordinator.Api.Auth;

public interface ICurrentUserAccessor
{
    Guid? UserId { get; }
}

/// <summary>Reads "who is using this browser" from the session — see AuthController. A UI
/// convenience for defaults/ownership, not itself a security boundary (PIN elevation is).</summary>
public class CurrentUserAccessor(IHttpContextAccessor httpContextAccessor) : ICurrentUserAccessor
{
    public Guid? UserId
    {
        get
        {
            var idStr = httpContextAccessor.HttpContext?.Session.GetString(SessionKeys.CurrentUserId);
            return Guid.TryParse(idStr, out var id) ? id : null;
        }
    }
}
