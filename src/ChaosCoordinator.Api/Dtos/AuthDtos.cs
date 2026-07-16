using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Dtos;

public record SelectProfileRequest(Guid UserId);

public record VerifyPinRequest(Guid UserId, string Pin);

public record LoginRequest(Guid UserId, string Pin, bool Remember);

public record SessionDto(Guid? CurrentUserId, bool PinElevated);

/// <summary>One of the up to 6 additional members added at registration. Email is required for
/// Adult/Other when SendInvite is true (they get an invite to set their own password); with
/// SendInvite false, Email is optional and just saved for later (see UsersController's
/// send-account-email). Ignored for Child (device/PIN only — see plan_001.md decisions #5,
/// #6).</summary>
public record RegisterMemberRequest(string Name, Role Role, string? Email, bool SendInvite = true);

public record RegisterHouseholdRequest(
    string FamilyName,
    string FirstAdultName,
    string FirstAdultEmail,
    string FirstAdultPassword,
    List<RegisterMemberRequest> AdditionalMembers,
    string? TurnstileToken = null
);

public record RegisterResponse(Guid HouseholdId, Guid FirstAdultUserId);

public record PasswordLoginRequest(string Email, string Password, bool Remember, string? TurnstileToken = null);

public record VerifyEmailRequest(string Token);

public record AcceptInviteRequest(string Token, string Password);
