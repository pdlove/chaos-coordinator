// PLACEHOLDER — hand-written to match the Phase 0 DTOs so `core` has something to compile
// against before the API can actually run (this sandbox has no Postgres/Docker to boot it against).
// Once the API is reachable, replace this file by running `npm run codegen` in this package,
// which regenerates it from the live OpenAPI spec via openapi-typescript. Do not hand-edit past
// Phase 0 — let codegen own this file.

import type { BillStatus, HouseholdTaskStatus, MealType, RecurrenceFrequency, RecurrenceType, Role } from "../constants";

export interface UserDto {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: Role;
  order: number;
  hasPin: boolean;
  email: string | null;
  /** True once this user has clicked a verification/invite link for email. */
  emailVerified: boolean;
}

export interface HouseholdDto {
  id: string;
  name: string;
  users: UserDto[];
  bottomBarTabs: string[];
}

export interface UpdateBottomBarTabsRequest {
  tabs: string[];
}

export interface SessionDto {
  currentUserId: string | null;
  pinElevated: boolean;
}

export interface SelectProfileRequest {
  userId: string;
}

export interface VerifyPinRequest {
  userId: string;
  pin: string;
}

export interface LoginRequest {
  userId: string;
  pin: string;
  remember: boolean;
}

export interface RegisterMemberRequest {
  name: string;
  role: Role;
  email: string | null;
  sendInvite: boolean;
}

export interface RegisterHouseholdRequest {
  familyName: string;
  firstAdultName: string;
  firstAdultEmail: string;
  firstAdultPassword: string;
  additionalMembers: RegisterMemberRequest[];
  turnstileToken?: string | null;
}

export interface RegisterResponse {
  householdId: string;
  firstAdultUserId: string;
}

export interface PasswordLoginRequest {
  email: string;
  password: string;
  remember: boolean;
  turnstileToken?: string | null;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface AcceptInviteRequest {
  token: string;
  password: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface SavedLocationDto {
  id: string;
  name: string;
  address: string | null;
  order: number;
}

export interface CreateCalendarCategoryRequest {
  name: string;
  color: string;
  order: number;
}

export type UpdateCalendarCategoryRequest = CreateCalendarCategoryRequest;

export interface CreateSavedLocationRequest {
  name: string;
  address: string | null;
  order: number;
}

export type UpdateSavedLocationRequest = CreateSavedLocationRequest;

export interface CalendarEventDto {
  id: string;
  title: string;
  start: string;
  end: string | null;
  category: CategoryDto;
  location: string | null;
  notes: string | null;
  ownerId: string;
  ownerName: string;
  attendees: UserDto[];
  createdAt: string;
  isOwnedByCurrentUser: boolean;
  /** Null = non-recurring. */
  recurrenceFrequency: RecurrenceFrequency | null;
  /** Repeat every N days/weeks/months, per recurrenceFrequency. */
  recurrenceInterval: number;
  /** Weekly only: comma-separated DayOfWeek ints (0=Sun…6=Sat), e.g. "1,3". */
  recurrenceDays: string | null;
  /** Monthly "specific date" mode: day of month, or -1 for last day. */
  recurrenceMonthDay: number | null;
  /** Monthly "nth weekday" mode: 1-4, or -1 for last. Pairs with recurrenceWeekday. */
  recurrenceWeekOrdinal: number | null;
  /** Monthly "nth weekday" mode: DayOfWeek int (0=Sun…6=Sat). */
  recurrenceWeekday: number | null;
  /** ISO datetime of the series end date. Null = open-ended. */
  recurrenceEnd: string | null;
  /** Set for recurring instances; pass as `date` to POST /api/events/{id}/exceptions,
   * /instances, /split, or /truncate to act on this occurrence. */
  instanceDate: string | null;
  /** "Leave by" date/time. Null = no travel time set. Display as (start - travelTimeLeaveBy) minutes. */
  travelTimeLeaveBy: string | null;
  /** Comma-separated minutes-before-start offsets, e.g. "10,60,1440". Storage/display only. */
  reminders: string | null;
  /** Source image(s) this event was created from via the photo-import flow. Empty when the
   * event was created the normal way. */
  sourceImageUrls: string[];
}

export interface CreateEventRequest {
  title: string;
  start: string;
  end: string | null;
  categoryId: string;
  location: string | null;
  notes: string | null;
  attendeeUserIds: string[];
  recurrenceFrequency: RecurrenceFrequency | null;
  recurrenceInterval: number;
  recurrenceDays: string | null;
  recurrenceMonthDay: number | null;
  recurrenceWeekOrdinal: number | null;
  recurrenceWeekday: number | null;
  recurrenceEnd: string | null;
  travelTimeLeaveBy: string | null;
  reminders: string | null;
}

export interface UpdateEventRequest {
  title: string;
  start: string;
  end: string | null;
  categoryId: string;
  location: string | null;
  notes: string | null;
  attendeeUserIds: string[];
  recurrenceFrequency: RecurrenceFrequency | null;
  recurrenceInterval: number;
  recurrenceDays: string | null;
  recurrenceMonthDay: number | null;
  recurrenceWeekOrdinal: number | null;
  recurrenceWeekday: number | null;
  recurrenceEnd: string | null;
  travelTimeLeaveBy: string | null;
  reminders: string | null;
}

// ---- Create events from a photo / pasted text ----

/** Minimal summary of an existing event a candidate might duplicate. */
export interface ExistingEventSummaryDto {
  id: string;
  title: string;
  start: string;
}

/** One event as read off the submitted photo(s)/text, with category/attendees/reminders already
 * pre-filled from the request's defaults (still editable before confirming). `duplicateOf` is set
 * when it looks like it might already exist on the calendar. */
export interface ExtractedEventCandidateDto {
  title: string;
  start: string;
  end: string | null;
  location: string | null;
  notes: string | null;
  categoryId: string;
  attendeeUserIds: string[];
  reminders: string | null;
  duplicateOf: ExistingEventSummaryDto | null;
}

export interface ExtractEventsResponse {
  batchId: string;
  candidates: ExtractedEventCandidateDto[];
}

/** One candidate the user chose to keep, with whatever edits they made in the review screen. No
 * recurrence fields — imported entries are always one-off. */
export interface ConfirmedEventCandidate {
  title: string;
  start: string;
  end: string | null;
  categoryId: string;
  location: string | null;
  notes: string | null;
  attendeeUserIds: string[];
  reminders: string | null;
}

export interface ConfirmEventImportRequest {
  batchId: string;
  events: ConfirmedEventCandidate[];
}

export interface CancelEventOccurrenceRequest {
  /** ISO datetime of the occurrence to cancel. */
  date: string;
}

/** Edit just one occurrence of a recurring event ("this event only"). */
export interface EditEventOccurrenceRequest {
  date: string;
  title: string;
  start: string;
  end: string | null;
  categoryId: string;
  location: string | null;
  notes: string | null;
}

/** Edit "this and following" occurrences — truncates the original series at `date` and creates a
 * new series starting there with the edited fields. */
export interface SplitEventSeriesRequest {
  date: string;
  title: string;
  start: string;
  end: string | null;
  categoryId: string;
  location: string | null;
  notes: string | null;
  attendeeUserIds: string[];
  recurrenceFrequency: RecurrenceFrequency | null;
  recurrenceInterval: number;
  recurrenceDays: string | null;
  recurrenceMonthDay: number | null;
  recurrenceWeekOrdinal: number | null;
  recurrenceWeekday: number | null;
  travelTimeLeaveBy: string | null;
  reminders: string | null;
}

/** Delete "this and following" occurrences — truncates the series at `date`, no continuation. */
export interface TruncateEventSeriesRequest {
  date: string;
}

// ---- Chores ----

export interface ChoreDto {
  id: string;
  groupId: string;
  title: string;
  instructions: string | null;
  recurrenceType: RecurrenceType;
  recurrenceDays: string | null;
  photoRequired: boolean;
  alarmTime: string | null; // "HH:mm"
  assignees: UserDto[];
  completedToday: boolean;
  completedAt: string | null;
  completedByName: string | null;
  photoUrl: string | null;
}

export interface ChoreGroupDto {
  id: string;
  name: string;
  doneByTime: string; // "HH:mm"
  order: number;
  chores: ChoreDto[];
}

export interface CreateChoreGroupRequest {
  name: string;
  doneByTime: string;
  order: number;
}

export type UpdateChoreGroupRequest = CreateChoreGroupRequest;

export interface CreateChoreRequest {
  groupId: string;
  title: string;
  instructions: string | null;
  recurrenceType: RecurrenceType;
  recurrenceDays: string | null;
  photoRequired: boolean;
  alarmTime: string | null; // "HH:mm"
  assigneeUserIds: string[];
}

export interface UpdateChoreRequest {
  title: string;
  instructions: string | null;
  recurrenceType: RecurrenceType;
  recurrenceDays: string | null;
  photoRequired: boolean;
  alarmTime: string | null; // "HH:mm"
  assigneeUserIds: string[];
}

export interface CompleteChoreRequest {
  date: string; // "YYYY-MM-DD"
  photoUrl: string | null;
}

// ---- Household task pool ----

export interface HouseholdTaskDto {
  id: string;
  title: string;
  note: string | null;
  status: HouseholdTaskStatus;
  claimedBy: UserDto[];
  createdAt: string;
  completedAt: string | null;
}

export interface CreateHouseholdTaskRequest {
  title: string;
  note: string | null;
}

// ---- Projects ----

export interface ProjectTaskDto {
  id: string;
  title: string;
  done: boolean;
  assigneeId: string | null;
  assigneeName: string | null;
  order: number;
}

export interface ProjectSummaryDto {
  id: string;
  name: string;
  totalCount: number;
  doneCount: number;
  contributors: UserDto[];
}

export interface ProjectDetailDto {
  id: string;
  name: string;
  tasks: ProjectTaskDto[];
}

export interface CreateProjectRequest {
  name: string;
}

export interface CreateProjectTaskRequest {
  title: string;
  assigneeId: string | null;
}

export interface UpdateProjectTaskRequest {
  title: string;
  done: boolean;
  assigneeId: string | null;
  order: number;
}

// ---- Shopping ----

export interface StoreDto {
  id: string;
  name: string;
  order: number;
}

export interface ShoppingItemDto {
  id: string;
  storeId: string;
  name: string;
  department: string;
  note: string | null;
  quantity: number;
  checked: boolean;
  lastPaidPrice: number | null;
}

export interface PriceHistoryEntryDto {
  paidAt: string;
  price: number;
}

export interface ItemSuggestionDto {
  name: string;
  department: string;
  timesBought: number;
  lastPrice: number | null;
}

export interface CreateStoreRequest {
  name: string;
}

export interface CreateItemRequest {
  name: string;
  department: string;
  note: string | null;
  quantity: number;
}

export interface UpdateItemRequest {
  name: string;
  department: string;
  note: string | null;
  quantity: number;
  checked: boolean;
}

export interface PayItemRequest {
  price: number;
}

// ---- Bills ----

export interface BillDto {
  id: string;
  title: string;
  managedById: string;
  managedByName: string;
  dueDate: string; // "YYYY-MM-DD"
  amount: number | null;
  amountMin: number | null;
  amountMax: number | null;
  status: BillStatus;
  paidDate: string | null;
}

export interface BillsMonthDto {
  billingMonth: string;
  dueTotal: number;
  paidTotal: number;
  overdueTotal: number;
  carriedOver: BillDto[];
  current: BillDto[];
}

export interface BillTemplateDto {
  id: string;
  title: string;
  managedById: string;
  managedByName: string;
  dueDay: number;
  amount: number | null;
  amountMin: number | null;
  amountMax: number | null;
  active: boolean;
}

export interface CreateBillTemplateRequest {
  title: string;
  managedById: string;
  dueDay: number;
  amount: number | null;
  amountMin: number | null;
  amountMax: number | null;
}

export interface UpdateBillTemplateRequest extends CreateBillTemplateRequest {
  active: boolean;
}

// ---- Food ----

export interface MenuEaterDto {
  userId: string;
  name: string;
  initials: string;
  color: string;
  dietaryTags: string[];
}

export interface SubstitutionDto {
  id: string;
  forUserId: string;
  forUserName: string;
  dish: string;
  dietaryLabel: string;
}

export interface MenuEntryDto {
  id: string;
  date: string; // "YYYY-MM-DD"
  mealType: MealType;
  dish: string;
  recipeId: string | null;
  recipeTitle: string | null;
  eaters: MenuEaterDto[];
  substitutions: SubstitutionDto[];
}

export interface UpsertMenuEntryRequest {
  date: string;
  mealType: MealType;
  dish: string;
  recipeId: string | null;
  eaterUserIds: string[];
}

export interface CreateSubstitutionRequest {
  forUserId: string;
  dish: string;
  dietaryLabel: string;
}

export interface RecipeDto {
  id: string;
  title: string;
  prepMinutes: number;
  cookMinutes: number;
  instructions: string | null;
}

export interface CreateRecipeRequest {
  title: string;
  prepMinutes: number;
  cookMinutes: number;
  instructions: string | null;
}

export type UpdateRecipeRequest = CreateRecipeRequest;

export interface DietaryTagDto {
  id: string;
  tag: string;
}

export interface CreateDietaryTagRequest {
  tag: string;
}

// ---- Users / people & roles ----

export interface CreateUserRequest {
  name: string;
  initials: string;
  color: string;
  role: Role;
  order: number;
  email: string | null;
}

export type UpdateUserRequest = CreateUserRequest;

export interface SetPinRequest {
  pin: string;
}

// ---- Push notifications ----

export interface VapidPublicKeyDto {
  publicKey: string | null;
}

export interface SubscribeToPushRequest {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface UnsubscribeFromPushRequest {
  endpoint: string;
}
