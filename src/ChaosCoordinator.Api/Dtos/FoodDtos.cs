using ChaosCoordinator.Domain;

namespace ChaosCoordinator.Api.Dtos;

/// <summary>Distinct from UserDto: carries each eater's standing dietary tags so the client can
/// prompt "Carmen is gluten-free — add a substitution?" without a second round trip.</summary>
public record MenuEaterDto(Guid UserId, string Name, string Initials, string Color, List<string> DietaryTags);

public record SubstitutionDto(Guid Id, Guid ForUserId, string ForUserName, string Dish, string DietaryLabel);

public record MenuEntryDto(
    Guid Id,
    DateOnly Date,
    MealType MealType,
    string Dish,
    Guid? RecipeId,
    string? RecipeTitle,
    List<MenuEaterDto> Eaters,
    List<SubstitutionDto> Substitutions
);

public record UpsertMenuEntryRequest(DateOnly Date, MealType MealType, string Dish, Guid? RecipeId, List<Guid> EaterUserIds);

public record CreateSubstitutionRequest(Guid ForUserId, string Dish, string DietaryLabel);

public record RecipeDto(Guid Id, string Title, int PrepMinutes, int CookMinutes, string? Instructions);
public record CreateRecipeRequest(string Title, int PrepMinutes, int CookMinutes, string? Instructions);
public record UpdateRecipeRequest(string Title, int PrepMinutes, int CookMinutes, string? Instructions);

public record DietaryTagDto(Guid Id, string Tag);
public record CreateDietaryTagRequest(string Tag);

public static class FoodDtoMapping
{
    public static MenuEaterDto ToEaterDto(this User u) =>
        new(u.Id, u.Name, u.Initials, u.Color, u.DietaryTags.Select(t => t.Tag).ToList());

    public static SubstitutionDto ToDto(this Substitution s) => new(s.Id, s.ForUserId, s.ForUser?.Name ?? "", s.Dish, s.DietaryLabel);

    public static MenuEntryDto ToDto(this MenuEntry m) => new(
        m.Id, m.Date, m.MealType, m.Dish, m.RecipeId, m.Recipe?.Title,
        m.Eaters.Where(e => e.User is not null).Select(e => e.User!.ToEaterDto()).ToList(),
        m.Substitutions.Select(s => s.ToDto()).ToList()
    );

    public static RecipeDto ToDto(this Recipe r) => new(r.Id, r.Title, r.PrepMinutes, r.CookMinutes, r.Instructions);
}
