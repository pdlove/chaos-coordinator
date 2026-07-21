using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Household> Households => Set<Household>();
    public DbSet<User> Users => Set<User>();
    public DbSet<AccountToken> AccountTokens => Set<AccountToken>();

    public DbSet<CalendarEvent> CalendarEvents => Set<CalendarEvent>();
    public DbSet<EventAttendee> EventAttendees => Set<EventAttendee>();
    public DbSet<EventException> EventExceptions => Set<EventException>();
    public DbSet<CalendarCategory> CalendarCategories => Set<CalendarCategory>();
    public DbSet<SavedLocation> SavedLocations => Set<SavedLocation>();
    public DbSet<EventImportBatch> EventImportBatches => Set<EventImportBatch>();
    public DbSet<EventImportImage> EventImportImages => Set<EventImportImage>();

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
    public DbSet<BillPhotoBatch> BillPhotoBatches => Set<BillPhotoBatch>();
    public DbSet<BillPhotoImage> BillPhotoImages => Set<BillPhotoImage>();

    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<MenuEntry> MenuEntries => Set<MenuEntry>();
    public DbSet<MenuEater> MenuEaters => Set<MenuEater>();
    public DbSet<Substitution> Substitutions => Set<Substitution>();
    public DbSet<DietaryTag> DietaryTags => Set<DietaryTag>();

    public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();
    public DbSet<SentReminder> SentReminders => Set<SentReminder>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
