using ChaosCoordinator.Domain;
using Microsoft.EntityFrameworkCore;

namespace ChaosCoordinator.Data;

/// <summary>Seeds one household (Carmen/Paul/Ben/Emma/Tina) with sample data across every resource,
/// matching the people/events/chores shown in the original design handoff. Idempotent — no-ops if
/// a household already exists.</summary>
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Households.AnyAsync()) return;

        var household = new Household { Id = Guid.NewGuid(), Name = "The Household", CreatedAt = DateTime.UtcNow };
        db.Households.Add(household);

        var carmen = new User { Id = Guid.NewGuid(), HouseholdId = household.Id, Name = "Carmen", Initials = "CL", Color = "#FF6B57", Role = Role.Parent, Order = 0, PinHash = BCrypt.Net.BCrypt.HashPassword("1234") };
        var paul = new User { Id = Guid.NewGuid(), HouseholdId = household.Id, Name = "Paul", Initials = "PL", Color = "#4C8BF5", Role = Role.Parent, Order = 1, PinHash = BCrypt.Net.BCrypt.HashPassword("5678") };
        var ben = new User { Id = Guid.NewGuid(), HouseholdId = household.Id, Name = "Ben", Initials = "BL", Color = "#1FB6A6", Role = Role.Child, Order = 2, PinHash = BCrypt.Net.BCrypt.HashPassword("1111") };
        var emma = new User { Id = Guid.NewGuid(), HouseholdId = household.Id, Name = "Emma", Initials = "EL", Color = "#F2A93B", Role = Role.Child, Order = 3, PinHash = BCrypt.Net.BCrypt.HashPassword("2222") };
        var tina = new User { Id = Guid.NewGuid(), HouseholdId = household.Id, Name = "Tina", Initials = "TM", Color = "#9B6BD9", Role = Role.Adult, Order = 4, PinHash = BCrypt.Net.BCrypt.HashPassword("3333") };
        db.Users.AddRange(carmen, paul, ben, emma, tina);

        db.DietaryTags.Add(new DietaryTag { Id = Guid.NewGuid(), UserId = carmen.Id, Tag = "gluten-free" });

        var today = DateOnly.FromDateTime(DateTime.Today);
        var todayUtc = DateTime.UtcNow.Date;

        // ---- Calendar ----
        var standup = new CalendarEvent
        {
            Id = Guid.NewGuid(), HouseholdId = household.Id, Title = "Team standup",
            Start = todayUtc.AddHours(9), End = todayUtc.AddHours(9.5), Category = EventCategory.Work,
            OwnerId = paul.Id, CreatedAt = DateTime.UtcNow,
        };
        var grocery = new CalendarEvent
        {
            Id = Guid.NewGuid(), HouseholdId = household.Id, Title = "Grocery run",
            Start = todayUtc.AddHours(11), End = todayUtc.AddHours(12), Category = EventCategory.Home,
            OwnerId = carmen.Id, CreatedAt = DateTime.UtcNow,
        };
        var dentist = new CalendarEvent
        {
            Id = Guid.NewGuid(), HouseholdId = household.Id, Title = "Dentist — Emma",
            Start = todayUtc.AddHours(14), End = todayUtc.AddHours(14.75), Category = EventCategory.Doctor,
            OwnerId = carmen.Id, CreatedAt = DateTime.UtcNow,
        };
        var soccer = new CalendarEvent
        {
            Id = Guid.NewGuid(), HouseholdId = household.Id, Title = "Soccer practice",
            Start = todayUtc.AddHours(16), End = todayUtc.AddHours(17.5), Category = EventCategory.Activities,
            OwnerId = paul.Id, CreatedAt = DateTime.UtcNow,
        };
        db.CalendarEvents.AddRange(standup, grocery, dentist, soccer);
        db.EventAttendees.AddRange(
            new EventAttendee { EventId = standup.Id, UserId = paul.Id },
            new EventAttendee { EventId = grocery.Id, UserId = carmen.Id },
            new EventAttendee { EventId = dentist.Id, UserId = emma.Id },
            new EventAttendee { EventId = dentist.Id, UserId = carmen.Id },
            new EventAttendee { EventId = soccer.Id, UserId = ben.Id }
        );

        // ---- Chore groups + chores ----
        var morning = new ChoreGroup { Id = Guid.NewGuid(), HouseholdId = household.Id, Name = "Morning", DoneByTime = new TimeOnly(8, 0), Order = 0 };
        var afterLunch = new ChoreGroup { Id = Guid.NewGuid(), HouseholdId = household.Id, Name = "After Lunch", DoneByTime = new TimeOnly(16, 0), Order = 1 };
        var beforeBed = new ChoreGroup { Id = Guid.NewGuid(), HouseholdId = household.Id, Name = "Before Bed", DoneByTime = new TimeOnly(20, 30), Order = 2 };
        db.ChoreGroups.AddRange(morning, afterLunch, beforeBed);

        var makeBed = new Chore { Id = Guid.NewGuid(), GroupId = morning.Id, Title = "Make bed", RecurrenceType = RecurrenceType.Daily };
        var feedDog = new Chore { Id = Guid.NewGuid(), GroupId = morning.Id, Title = "Feed the dog", RecurrenceType = RecurrenceType.Daily, PhotoRequired = true };
        var dishwasher = new Chore { Id = Guid.NewGuid(), GroupId = afterLunch.Id, Title = "Unload dishwasher", RecurrenceType = RecurrenceType.Daily };
        var trash = new Chore { Id = Guid.NewGuid(), GroupId = afterLunch.Id, Title = "Take out trash", RecurrenceType = RecurrenceType.CustomDays, RecurrenceDays = "1,4" };
        var vacuum = new Chore { Id = Guid.NewGuid(), GroupId = beforeBed.Id, Title = "Vacuum living room", RecurrenceType = RecurrenceType.Weekly, RecurrenceDays = "6", Instructions = "1. Clear floor of toys/shoes first\n2. Vacuum under the couch cushions too\n3. Empty canister when done, don't leave it full" };
        var backpack = new Chore { Id = Guid.NewGuid(), GroupId = beforeBed.Id, Title = "Pack backpack for school", RecurrenceType = RecurrenceType.Daily };
        db.Chores.AddRange(makeBed, feedDog, dishwasher, trash, vacuum, backpack);

        db.ChoreAssignments.AddRange(
            new ChoreAssignment { ChoreId = makeBed.Id, UserId = ben.Id },
            new ChoreAssignment { ChoreId = makeBed.Id, UserId = emma.Id },
            new ChoreAssignment { ChoreId = feedDog.Id, UserId = ben.Id },
            new ChoreAssignment { ChoreId = dishwasher.Id, UserId = emma.Id },
            new ChoreAssignment { ChoreId = trash.Id, UserId = ben.Id },
            new ChoreAssignment { ChoreId = vacuum.Id, UserId = emma.Id },
            new ChoreAssignment { ChoreId = backpack.Id, UserId = ben.Id }
        );
        db.ChoreCompletions.Add(new ChoreCompletion { Id = Guid.NewGuid(), ChoreId = dishwasher.Id, Date = today, CompletedById = emma.Id, CompletedAt = DateTime.UtcNow.Date.AddHours(12.25) });

        // ---- Household task pool ----
        db.HouseholdTasks.AddRange(
            new HouseholdTask { Id = Guid.NewGuid(), HouseholdId = household.Id, Title = "Fix leaky faucet", Note = "Kitchen sink", Status = HouseholdTaskStatus.Unclaimed, CreatedAt = DateTime.UtcNow },
            new HouseholdTask { Id = Guid.NewGuid(), HouseholdId = household.Id, Title = "Change AC filter", Note = "Due this week", Status = HouseholdTaskStatus.Unclaimed, CreatedAt = DateTime.UtcNow }
        );
        var garage = new HouseholdTask { Id = Guid.NewGuid(), HouseholdId = household.Id, Title = "Clean out garage", Status = HouseholdTaskStatus.Claimed, CreatedAt = DateTime.UtcNow };
        db.HouseholdTasks.Add(garage);
        db.TaskClaims.AddRange(
            new TaskClaim { TaskId = garage.Id, UserId = paul.Id },
            new TaskClaim { TaskId = garage.Id, UserId = tina.Id }
        );

        // ---- Projects ----
        var houseRepairs = new Project { Id = Guid.NewGuid(), HouseholdId = household.Id, Name = "House Repairs", CreatedAt = DateTime.UtcNow };
        db.Projects.Add(houseRepairs);
        db.ProjectTasks.AddRange(
            new ProjectTask { Id = Guid.NewGuid(), ProjectId = houseRepairs.Id, Title = "Patch drywall in hallway", Done = true, AssigneeId = paul.Id, Order = 0 },
            new ProjectTask { Id = Guid.NewGuid(), ProjectId = houseRepairs.Id, Title = "Re-caulk bathroom tub", Done = true, AssigneeId = carmen.Id, Order = 1 },
            new ProjectTask { Id = Guid.NewGuid(), ProjectId = houseRepairs.Id, Title = "Fix squeaky door hinges", Done = false, AssigneeId = paul.Id, Order = 2 },
            new ProjectTask { Id = Guid.NewGuid(), ProjectId = houseRepairs.Id, Title = "Replace porch light", Done = false, AssigneeId = paul.Id, Order = 3 },
            new ProjectTask { Id = Guid.NewGuid(), ProjectId = houseRepairs.Id, Title = "Reseal driveway", Done = false, AssigneeId = carmen.Id, Order = 4 }
        );

        // ---- Shopping ----
        var traderJoes = new Store { Id = Guid.NewGuid(), HouseholdId = household.Id, Name = "Trader Joe's", Order = 0 };
        db.Stores.AddRange(traderJoes,
            new Store { Id = Guid.NewGuid(), HouseholdId = household.Id, Name = "Costco", Order = 1 },
            new Store { Id = Guid.NewGuid(), HouseholdId = household.Id, Name = "Target", Order = 2 });

        var bananas = new ShoppingListItem { Id = Guid.NewGuid(), StoreId = traderJoes.Id, Name = "Bananas", Department = "Produce", Quantity = 2, LastPaidPrice = 2.50m, CreatedAt = DateTime.UtcNow };
        var avocados = new ShoppingListItem { Id = Guid.NewGuid(), StoreId = traderJoes.Id, Name = "Avocados", Department = "Produce", Note = "for Tuesday tacos", Quantity = 4, CreatedAt = DateTime.UtcNow };
        var oatMilk = new ShoppingListItem { Id = Guid.NewGuid(), StoreId = traderJoes.Id, Name = "Oat milk", Department = "Dairy & eggs", Quantity = 1, LastPaidPrice = 4.29m, CreatedAt = DateTime.UtcNow };
        var eggs = new ShoppingListItem { Id = Guid.NewGuid(), StoreId = traderJoes.Id, Name = "Eggs, dozen", Department = "Dairy & eggs", Checked = true, LastPaidPrice = 5.49m, CreatedAt = DateTime.UtcNow };
        var paperTowels = new ShoppingListItem { Id = Guid.NewGuid(), StoreId = traderJoes.Id, Name = "Paper towels", Department = "Household", Quantity = 2, LastPaidPrice = 12.99m, CreatedAt = DateTime.UtcNow };
        db.ShoppingListItems.AddRange(bananas, avocados, oatMilk, eggs, paperTowels);
        db.PriceHistoryEntries.AddRange(
            new PriceHistoryEntry { Id = Guid.NewGuid(), ItemId = oatMilk.Id, Price = 4.29m, PaidAt = DateTime.UtcNow.AddDays(-13) },
            new PriceHistoryEntry { Id = Guid.NewGuid(), ItemId = oatMilk.Id, Price = 4.15m, PaidAt = DateTime.UtcNow.AddDays(-27) },
            new PriceHistoryEntry { Id = Guid.NewGuid(), ItemId = oatMilk.Id, Price = 4.30m, PaidAt = DateTime.UtcNow.AddDays(-41) },
            new PriceHistoryEntry { Id = Guid.NewGuid(), ItemId = eggs.Id, Price = 5.49m, PaidAt = DateTime.UtcNow }
        );

        // ---- Bills ----
        var billingMonth = $"{today:yyyy-MM}";
        var mortgageTemplate = new BillTemplate { Id = Guid.NewGuid(), HouseholdId = household.Id, Title = "Mortgage", ManagedById = paul.Id, DueDay = 1, Amount = 1840m };
        var electricTemplate = new BillTemplate { Id = Guid.NewGuid(), HouseholdId = household.Id, Title = "Electric — PG&E", ManagedById = carmen.Id, DueDay = 12, AmountMin = 165m, AmountMax = 190m };
        var carInsuranceTemplate = new BillTemplate { Id = Guid.NewGuid(), HouseholdId = household.Id, Title = "Car insurance", ManagedById = paul.Id, DueDay = 28, Amount = 212m };
        var internetTemplate = new BillTemplate { Id = Guid.NewGuid(), HouseholdId = household.Id, Title = "Internet", ManagedById = carmen.Id, DueDay = 18, Amount = 80m };
        var streamingTemplate = new BillTemplate { Id = Guid.NewGuid(), HouseholdId = household.Id, Title = "Streaming bundle", ManagedById = carmen.Id, DueDay = 22, Amount = 34m };
        db.BillTemplates.AddRange(mortgageTemplate, electricTemplate, carInsuranceTemplate, internetTemplate, streamingTemplate);

        db.Bills.AddRange(
            new Bill { Id = Guid.NewGuid(), HouseholdId = household.Id, TemplateId = mortgageTemplate.Id, Title = mortgageTemplate.Title, ManagedById = paul.Id, DueDate = new DateOnly(today.Year, today.Month, 1), Amount = 1840m, Status = BillStatus.Paid, PaidDate = new DateOnly(today.Year, today.Month, 1).AddDays(-2), BillingMonth = billingMonth },
            new Bill { Id = Guid.NewGuid(), HouseholdId = household.Id, TemplateId = electricTemplate.Id, Title = electricTemplate.Title, ManagedById = carmen.Id, DueDate = new DateOnly(today.Year, today.Month, 12), AmountMin = 165m, AmountMax = 190m, Amount = 188m, Status = BillStatus.DueSoon, BillingMonth = billingMonth },
            new Bill { Id = Guid.NewGuid(), HouseholdId = household.Id, TemplateId = carInsuranceTemplate.Id, Title = carInsuranceTemplate.Title, ManagedById = paul.Id, DueDate = new DateOnly(today.Year, today.Month, 28), Amount = 212m, Status = BillStatus.Upcoming, BillingMonth = billingMonth },
            new Bill { Id = Guid.NewGuid(), HouseholdId = household.Id, TemplateId = internetTemplate.Id, Title = internetTemplate.Title, ManagedById = carmen.Id, DueDate = new DateOnly(today.Year, today.Month, 18), Amount = 80m, Status = BillStatus.Upcoming, BillingMonth = billingMonth },
            new Bill { Id = Guid.NewGuid(), HouseholdId = household.Id, TemplateId = streamingTemplate.Id, Title = streamingTemplate.Title, ManagedById = carmen.Id, DueDate = new DateOnly(today.Year, today.Month, 22), Amount = 34m, Status = BillStatus.Upcoming, BillingMonth = billingMonth }
        );
        // Carried-over unpaid car insurance from last month.
        var lastMonth = today.AddMonths(-1);
        db.Bills.Add(new Bill { Id = Guid.NewGuid(), HouseholdId = household.Id, TemplateId = carInsuranceTemplate.Id, Title = carInsuranceTemplate.Title, ManagedById = paul.Id, DueDate = new DateOnly(lastMonth.Year, lastMonth.Month, 28), Amount = 212m, Status = BillStatus.Overdue, BillingMonth = $"{lastMonth:yyyy-MM}" });

        // ---- Food ----
        var breakfast = new MenuEntry { Id = Guid.NewGuid(), HouseholdId = household.Id, Date = today, MealType = MealType.Breakfast, Dish = "Yogurt & granola" };
        var lunch = new MenuEntry { Id = Guid.NewGuid(), HouseholdId = household.Id, Date = today, MealType = MealType.Lunch, Dish = "Turkey sandwiches" };
        var dinnerRecipe = new Recipe { Id = Guid.NewGuid(), HouseholdId = household.Id, Title = "Sheet-pan fajitas", PrepMinutes = 15, CookMinutes = 20 };
        db.Recipes.Add(dinnerRecipe);
        var dinner = new MenuEntry { Id = Guid.NewGuid(), HouseholdId = household.Id, Date = today, MealType = MealType.Dinner, Dish = dinnerRecipe.Title, RecipeId = dinnerRecipe.Id };
        db.MenuEntries.AddRange(breakfast, lunch, dinner);
        db.MenuEaters.AddRange(
            new MenuEater { MenuEntryId = breakfast.Id, UserId = carmen.Id },
            new MenuEater { MenuEntryId = breakfast.Id, UserId = paul.Id },
            new MenuEater { MenuEntryId = breakfast.Id, UserId = ben.Id },
            new MenuEater { MenuEntryId = breakfast.Id, UserId = emma.Id },
            new MenuEater { MenuEntryId = lunch.Id, UserId = paul.Id },
            new MenuEater { MenuEntryId = lunch.Id, UserId = ben.Id },
            new MenuEater { MenuEntryId = lunch.Id, UserId = emma.Id },
            new MenuEater { MenuEntryId = dinner.Id, UserId = carmen.Id },
            new MenuEater { MenuEntryId = dinner.Id, UserId = paul.Id },
            new MenuEater { MenuEntryId = dinner.Id, UserId = ben.Id },
            new MenuEater { MenuEntryId = dinner.Id, UserId = emma.Id },
            new MenuEater { MenuEntryId = dinner.Id, UserId = tina.Id }
        );
        db.Substitutions.Add(new Substitution { Id = Guid.NewGuid(), MenuEntryId = lunch.Id, ForUserId = carmen.Id, Dish = "GF wrap", DietaryLabel = "gluten-free" });

        await db.SaveChangesAsync();
    }
}
