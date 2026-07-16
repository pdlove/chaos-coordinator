// Mirrors the C# enums in ChaosCoordinator.Domain — serialized as strings over the wire
// (HasConversion<string>() in the EF Core Fluent config), so these string unions are the wire format.

export type Role = "Adult" | "Child" | "Other";

export type EventCategory = "Work" | "School" | "Doctor" | "Home" | "Personal" | "Activities";

export type RecurrenceType = "Daily" | "Weekly" | "CustomDays";

export type HouseholdTaskStatus = "Unclaimed" | "Claimed" | "InProgress" | "Done";

export type BillStatus = "Upcoming" | "DueSoon" | "Overdue" | "Paid";

export type MealType = "Breakfast" | "Lunch" | "Dinner";

/** Category tag colors, from the design handoff (Chaos Coordinator.dc.html). */
export const CATEGORY_COLORS: Record<EventCategory, { bg: string; fg: string }> = {
  Work: { bg: "#EAF1FE", fg: "#4C8BF5" },
  School: { bg: "#F2ECFB", fg: "#9B6BD9" },
  Doctor: { bg: "#FDEBEF", fg: "#E8607A" },
  Home: { bg: "#E7F8F6", fg: "#1B9A8C" },
  Personal: { bg: "#FEF3E2", fg: "#C97F16" },
  Activities: { bg: "#FFEDE9", fg: "#E1543C" },
};

/** Solid category colors used for calendar left-borders and avatar-adjacent accents. */
export const CATEGORY_ACCENT: Record<EventCategory, string> = {
  Work: "#4C8BF5",
  School: "#9B6BD9",
  Doctor: "#E8607A",
  Home: "#1FB6A6",
  Personal: "#F2A93B",
  Activities: "#FF6B57",
};
