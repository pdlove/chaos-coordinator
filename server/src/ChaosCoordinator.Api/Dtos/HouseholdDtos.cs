using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Dtos;

public record UserDto(Guid Id, string Name, string Initials, string Color, Role Role, int Order, bool HasPin);

public record HouseholdDto(Guid Id, string Name, List<UserDto> Users, List<string> BottomBarTabs);

public record CreateUserRequest(string Name, string Initials, string Color, Role Role, int Order);
public record UpdateUserRequest(string Name, string Initials, string Color, Role Role, int Order);
public record SetPinRequest(string Pin);
public record UpdateBottomBarTabsRequest(List<string> Tabs);

public static class DtoMapping
{
    public static UserDto ToDto(this User u) =>
        new(u.Id, u.Name, u.Initials, u.Color, u.Role, u.Order, !string.IsNullOrEmpty(u.PinHash));

    public static List<string> BottomBarTabsList(this Household h) =>
        h.BottomBarTabs.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList();
}
