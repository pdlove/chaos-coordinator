using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Dtos;

public record SelectProfileRequest(Guid UserId);

public record VerifyPinRequest(Guid UserId, string Pin);

public record LoginRequest(Guid UserId, string Pin, bool Remember);

public record SessionDto(Guid? CurrentUserId, bool PinElevated);

/// <summary>One of the up to 6 additional members added at registration. Email is required for
/// Adult/Other (they get an invite to set their own password) and ignored for Child (device/PIN
/// only — see plan_001.md decisions #5, #6).</summary>
public record RegisterMemberRequest(string Name, Role Role, string? Email);

public record RegisterHouseholdRequest(
    string FamilyName,
    string FirstAdultName,
    string FirstAdultEmail,
    string FirstAdultPassword,
    List<RegisterMemberRequest> AdditionalMembers
);

public record RegisterResponse(Guid HouseholdId, Guid FirstAdultUserId);

public record PasswordLoginRequest(string Email, string Password, bool Remember);

public record VerifyEmailRequest(string Token);

public record AcceptInviteRequest(string Token, string Password);
