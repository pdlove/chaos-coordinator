using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Dtos;

public record UserDto(
    Guid Id, string Name, string Initials, string Color, Role Role, int Order, bool HasPin,
    string? Email,
    /// <summary>True once this user has clicked a verification/invite link for Email. Used by
    /// People &amp; roles to decide whether "send account email" should read as a first-time
    /// welcome/invite or a password reset.</summary>
    bool EmailVerified
);

public record HouseholdDto(Guid Id, string Name, List<UserDto> Users, List<string> BottomBarTabs);

public record CreateUserRequest(string Name, string Initials, string Color, Role Role, int Order, string? Email);
public record UpdateUserRequest(string Name, string Initials, string Color, Role Role, int Order, string? Email);
public record SetPinRequest(string Pin);
public record UpdateBottomBarTabsRequest(List<string> Tabs);

public static class DtoMapping
{
    public static UserDto ToDto(this User u) =>
        new(u.Id, u.Name, u.Initials, u.Color, u.Role, u.Order, !string.IsNullOrEmpty(u.PinHash),
            u.Email, u.EmailVerifiedAt is not null);

    public static List<string> BottomBarTabsList(this Household h) =>
        h.BottomBarTabs.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList();
}
