/**
 * SignalR message names. Mirrored by hand against
 * server/src/ChaosCoordinator.Api/Realtime/RealtimeEvents.cs — these are just string method
 * names, both sides only need to agree on the strings, not full schemas.
 */
export const RealtimeEvents = {
  HouseholdChanged: "household:changed",
  CalendarChanged: "calendar:changed",
  ChoresChanged: "chores:changed",
  TasksChanged: "tasks:changed",
  ProjectsChanged: "projects:changed",
  ShoppingChanged: "shopping:changed",
  BillsChanged: "bills:changed",
  FoodChanged: "food:changed",
} as const;

export type RealtimeEvent = (typeof RealtimeEvents)[keyof typeof RealtimeEvents];
