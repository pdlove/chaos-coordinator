using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Household> Households => Set<Household>();
    public DbSet<User> Users => Set<User>();

    public DbSet<CalendarEvent> CalendarEvents => Set<CalendarEvent>();
    public DbSet<EventAttendee> EventAttendees => Set<EventAttendee>();
    public DbSet<EventException> EventExceptions => Set<EventException>();

    public DbSet<ChoreGroup> ChoreGroups => Set<ChoreGroup>();
    public DbSet<Chore> Chores => Set<Chore>();
    public DbSet<ChoreAssignment> ChoreAssignments => Set<ChoreAssignment>();
    public DbSet<ChoreCompletion> ChoreCompletions => Set<ChoreCompletion>();

    public DbSet<HouseholdTask> HouseholdTasks => Set<HouseholdTask>();
    public DbSet<TaskClaim> TaskClaims => Set<TaskClaim>();

    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectTask> ProjectTasks => Set<ProjectTask>();

    public DbSet<Store> Stores => Set<Store>();
    public DbSet<ShoppingListItem> ShoppingListItems => Set<ShoppingListItem>();
    public DbSet<PriceHistoryEntry> PriceHistoryEntries => Set<PriceHistoryEntry>();

    public DbSet<BillTemplate> BillTemplates => Set<BillTemplate>();
    public DbSet<Bill> Bills => Set<Bill>();

    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<MenuEntry> MenuEntries => Set<MenuEntry>();
    public DbSet<MenuEater> MenuEaters => Set<MenuEater>();
    public DbSet<Substitution> Substitutions => Set<Substitution>();
    public DbSet<DietaryTag> DietaryTags => Set<DietaryTag>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
