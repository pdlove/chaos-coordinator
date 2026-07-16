// Mirrors the C# enums in ChaosCoordinator.Domain — serialized as strings over the wire
// (HasConversion<string>() in the EF Core Fluent config), so these string unions are the wire format.

export type Role = "Adult" | "Child" | "Other";

export type RecurrenceType = "Daily" | "Weekly" | "CustomDays";

/** Calendar event recurrence — distinct from chores' RecurrenceType above. */
export type RecurrenceFrequency = "Daily" | "Weekly" | "Monthly";

export type HouseholdTaskStatus = "Unclaimed" | "Claimed" | "InProgress" | "Done";

export type BillStatus = "Upcoming" | "DueSoon" | "Overdue" | "Paid";

export type MealType = "Breakfast" | "Lunch" | "Dinner";

/** Categories are household-configurable (CategoryDto.color) rather than a fixed set, so there's
 * no static color table anymore — see `categoryTint` for deriving a pill background from a
 * category's solid color. */
export function categoryTint(color: string): string {
  return `${color}22`; // ~13% opacity, hex alpha suffix
}
