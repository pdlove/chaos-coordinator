namespace ChaosCoordinator.Domain;

public enum Role { Adult, Child, Other }

public enum EventCategory { Work, School, Doctor, Home, Personal, Activities }

public enum RecurrenceType { Daily, Weekly, CustomDays }

public enum HouseholdTaskStatus { Unclaimed, Claimed, InProgress, Done }

public enum BillStatus { Upcoming, DueSoon, Overdue, Paid }

public enum MealType { Breakfast, Lunch, Dinner }

public enum AccountTokenPurpose { EmailVerification, Invite }
