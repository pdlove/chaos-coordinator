namespace ChaosCoordinator.Domain;

public enum Role { Adult, Child, Other }

public enum RecurrenceType { Daily, Weekly, CustomDays }

/// <summary>Calendar event recurrence — distinct from Chores' RecurrenceType, which predates this
/// and has different semantics (CustomDays vs a Weekly+RecurrenceDays combination here).</summary>
public enum RecurrenceFrequency { Daily, Weekly, Monthly }

public enum HouseholdTaskStatus { Unclaimed, Claimed, InProgress, Done }

public enum BillStatus { Upcoming, DueSoon, Overdue, Paid }

public enum MealType { Breakfast, Lunch, Dinner }

public enum AccountTokenPurpose { EmailVerification, Invite }
