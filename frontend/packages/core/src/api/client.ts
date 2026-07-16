import type {
  BillsMonthDto,
  BillTemplateDto,
  CalendarEventDto,
  CancelEventOccurrenceRequest,
  CategoryDto,
  ChoreDto,
  CreateBillTemplateRequest,
  UpdateBillTemplateRequest,
  ChoreGroupDto,
  CompleteChoreRequest,
  CreateCalendarCategoryRequest,
  CreateChoreGroupRequest,
  CreateChoreRequest,
  CreateEventRequest,
  CreateHouseholdTaskRequest,
  CreateSavedLocationRequest,
  LoginRequest,
  CreateDietaryTagRequest,
  CreateItemRequest,
  CreateProjectRequest,
  CreateProjectTaskRequest,
  CreateRecipeRequest,
  CreateStoreRequest,
  CreateSubstitutionRequest,
  CreateUserRequest,
  DietaryTagDto,
  EditEventOccurrenceRequest,
  HouseholdDto,
  HouseholdTaskDto,
  ItemSuggestionDto,
  MenuEntryDto,
  PasswordLoginRequest,
  PayItemRequest,
  PriceHistoryEntryDto,
  ProjectDetailDto,
  ProjectSummaryDto,
  ProjectTaskDto,
  RecipeDto,
  RegisterHouseholdRequest,
  RegisterResponse,
  AcceptInviteRequest,
  VerifyEmailRequest,
  SavedLocationDto,
  SelectProfileRequest,
  SessionDto,
  SetPinRequest,
  ShoppingItemDto,
  SplitEventSeriesRequest,
  StoreDto,
  SubscribeToPushRequest,
  SubstitutionDto,
  TruncateEventSeriesRequest,
  UnsubscribeFromPushRequest,
  UpdateBottomBarTabsRequest,
  UpdateCalendarCategoryRequest,
  UpdateChoreGroupRequest,
  UpdateChoreRequest,
  UpdateEventRequest,
  UpdateItemRequest,
  UpdateProjectTaskRequest,
  UpdateRecipeRequest,
  UpdateSavedLocationRequest,
  UpdateUserRequest,
  UpsertMenuEntryRequest,
  UserDto,
  VapidPublicKeyDto,
  VerifyPinRequest,
} from "@chaos-coordinator/shared";

/**
 * Relative by default — the supported dev/prod paths (Vite proxy, nginx in Docker) put the API
 * on the same origin as the web app, so no base URL is needed and cookies work without CORS/
 * SameSite gymnastics. A future React Native app has no "same origin" and must call
 * `configureApiClient({ baseUrl: "https://..." })` once at startup.
 */
let baseUrl = "";

export function configureApiClient(config: { baseUrl: string }) {
  baseUrl = config.baseUrl;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown
  ) {
    super(`API request failed with status ${status}`);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* no JSON body */
    }
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  getHousehold: () => apiFetch<HouseholdDto>("/api/household"),
  updateBottomBarTabs: (req: UpdateBottomBarTabsRequest) =>
    apiFetch<string[]>("/api/household/bottom-bar-tabs", { method: "PATCH", body: JSON.stringify(req) }),

  getSession: () => apiFetch<SessionDto>("/api/auth/session"),
  login: (req: LoginRequest) =>
    apiFetch<SessionDto>("/api/auth/login", { method: "POST", body: JSON.stringify(req) }),
  loginWithPassword: (req: PasswordLoginRequest) =>
    apiFetch<SessionDto>("/api/auth/login-password", { method: "POST", body: JSON.stringify(req) }),
  register: (req: RegisterHouseholdRequest) =>
    apiFetch<RegisterResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(req) }),
  verifyEmail: (req: VerifyEmailRequest) => apiFetch<void>("/api/auth/verify-email", { method: "POST", body: JSON.stringify(req) }),
  acceptInvite: (req: AcceptInviteRequest) =>
    apiFetch<SessionDto>("/api/auth/accept-invite", { method: "POST", body: JSON.stringify(req) }),
  logout: () => apiFetch<SessionDto>("/api/auth/logout", { method: "POST" }),
  selectProfile: (req: SelectProfileRequest) =>
    apiFetch<SessionDto>("/api/auth/select-profile", { method: "POST", body: JSON.stringify(req) }),
  verifyPin: (req: VerifyPinRequest) =>
    apiFetch<SessionDto>("/api/auth/verify-pin", { method: "POST", body: JSON.stringify(req) }),
  exitEditMode: () => apiFetch<SessionDto>("/api/auth/exit-edit-mode", { method: "POST" }),

  getEvents: (from: Date, to: Date, category?: string) => {
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    if (category) params.set("category", category);
    return apiFetch<CalendarEventDto[]>(`/api/events?${params}`);
  },
  createEvent: (req: CreateEventRequest) =>
    apiFetch<CalendarEventDto>("/api/events", { method: "POST", body: JSON.stringify(req) }),
  updateEvent: (id: string, req: UpdateEventRequest) =>
    apiFetch<CalendarEventDto>(`/api/events/${id}`, { method: "PATCH", body: JSON.stringify(req) }),
  deleteEvent: (id: string) => apiFetch<void>(`/api/events/${id}`, { method: "DELETE" }),
  cancelEventOccurrence: (id: string, req: CancelEventOccurrenceRequest) =>
    apiFetch<void>(`/api/events/${id}/exceptions`, { method: "POST", body: JSON.stringify(req) }),
  editEventOccurrence: (id: string, req: EditEventOccurrenceRequest) =>
    apiFetch<void>(`/api/events/${id}/instances`, { method: "POST", body: JSON.stringify(req) }),
  splitEventSeries: (id: string, req: SplitEventSeriesRequest) =>
    apiFetch<CalendarEventDto>(`/api/events/${id}/split`, { method: "POST", body: JSON.stringify(req) }),
  truncateEventSeries: (id: string, req: TruncateEventSeriesRequest) =>
    apiFetch<void>(`/api/events/${id}/truncate`, { method: "POST", body: JSON.stringify(req) }),

  getCalendarCategories: () => apiFetch<CategoryDto[]>("/api/calendar-categories"),
  createCalendarCategory: (req: CreateCalendarCategoryRequest) =>
    apiFetch<CategoryDto>("/api/calendar-categories", { method: "POST", body: JSON.stringify(req) }),
  updateCalendarCategory: (id: string, req: UpdateCalendarCategoryRequest) =>
    apiFetch<void>(`/api/calendar-categories/${id}`, { method: "PATCH", body: JSON.stringify(req) }),
  deleteCalendarCategory: (id: string) => apiFetch<void>(`/api/calendar-categories/${id}`, { method: "DELETE" }),

  getSavedLocations: () => apiFetch<SavedLocationDto[]>("/api/saved-locations"),
  createSavedLocation: (req: CreateSavedLocationRequest) =>
    apiFetch<SavedLocationDto>("/api/saved-locations", { method: "POST", body: JSON.stringify(req) }),
  updateSavedLocation: (id: string, req: UpdateSavedLocationRequest) =>
    apiFetch<void>(`/api/saved-locations/${id}`, { method: "PATCH", body: JSON.stringify(req) }),
  deleteSavedLocation: (id: string) => apiFetch<void>(`/api/saved-locations/${id}`, { method: "DELETE" }),

  getChoreGroups: (date: string) => apiFetch<ChoreGroupDto[]>(`/api/chore-groups?date=${date}`),
  createChoreGroup: (req: CreateChoreGroupRequest) =>
    apiFetch<ChoreGroupDto>("/api/chore-groups", { method: "POST", body: JSON.stringify(req) }),
  updateChoreGroup: (id: string, req: UpdateChoreGroupRequest) =>
    apiFetch<void>(`/api/chore-groups/${id}`, { method: "PATCH", body: JSON.stringify(req) }),
  deleteChoreGroup: (id: string) => apiFetch<void>(`/api/chore-groups/${id}`, { method: "DELETE" }),

  createChore: (req: CreateChoreRequest) => apiFetch<ChoreDto>("/api/chores", { method: "POST", body: JSON.stringify(req) }),
  updateChore: (id: string, req: UpdateChoreRequest) =>
    apiFetch<void>(`/api/chores/${id}`, { method: "PATCH", body: JSON.stringify(req) }),
  deleteChore: (id: string) => apiFetch<void>(`/api/chores/${id}`, { method: "DELETE" }),
  completeChore: (id: string, req: CompleteChoreRequest) =>
    apiFetch<void>(`/api/chores/${id}/complete`, { method: "POST", body: JSON.stringify(req) }),
  uncompleteChore: (id: string, date: string) => apiFetch<void>(`/api/chores/${id}/complete/${date}`, { method: "DELETE" }),
  uploadChorePhoto: async (file: Blob, fileName: string) => {
    const form = new FormData();
    form.append("file", file, fileName);
    const res = await fetch(`${baseUrl}/api/uploads/chore-photo`, { method: "POST", credentials: "include", body: form });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
    return (await res.json()) as { url: string };
  },

  getHouseholdTasks: () => apiFetch<HouseholdTaskDto[]>("/api/tasks"),
  createHouseholdTask: (req: CreateHouseholdTaskRequest) =>
    apiFetch<HouseholdTaskDto>("/api/tasks", { method: "POST", body: JSON.stringify(req) }),
  claimHouseholdTask: (id: string) => apiFetch<void>(`/api/tasks/${id}/claim`, { method: "POST" }),
  unclaimHouseholdTask: (id: string) => apiFetch<void>(`/api/tasks/${id}/unclaim`, { method: "POST" }),
  completeHouseholdTask: (id: string) => apiFetch<void>(`/api/tasks/${id}/complete`, { method: "POST" }),
  deleteHouseholdTask: (id: string) => apiFetch<void>(`/api/tasks/${id}`, { method: "DELETE" }),

  getProjects: () => apiFetch<ProjectSummaryDto[]>("/api/projects"),
  getProject: (id: string) => apiFetch<ProjectDetailDto>(`/api/projects/${id}`),
  createProject: (req: CreateProjectRequest) => apiFetch<ProjectSummaryDto>("/api/projects", { method: "POST", body: JSON.stringify(req) }),
  addProjectTask: (projectId: string, req: CreateProjectTaskRequest) =>
    apiFetch<ProjectTaskDto>(`/api/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(req) }),
  updateProjectTask: (id: string, req: UpdateProjectTaskRequest) =>
    apiFetch<void>(`/api/project-tasks/${id}`, { method: "PATCH", body: JSON.stringify(req) }),

  getStores: () => apiFetch<StoreDto[]>("/api/stores"),
  createStore: (req: CreateStoreRequest) => apiFetch<StoreDto>("/api/stores", { method: "POST", body: JSON.stringify(req) }),
  getShoppingItems: (storeId: string) => apiFetch<ShoppingItemDto[]>(`/api/stores/${storeId}/items`),
  createShoppingItem: (storeId: string, req: CreateItemRequest) =>
    apiFetch<ShoppingItemDto>(`/api/stores/${storeId}/items`, { method: "POST", body: JSON.stringify(req) }),
  updateShoppingItem: (id: string, req: UpdateItemRequest) =>
    apiFetch<void>(`/api/items/${id}`, { method: "PATCH", body: JSON.stringify(req) }),
  payShoppingItem: (id: string, req: PayItemRequest) => apiFetch<void>(`/api/items/${id}/pay`, { method: "POST", body: JSON.stringify(req) }),
  deleteShoppingItem: (id: string) => apiFetch<void>(`/api/items/${id}`, { method: "DELETE" }),
  getItemPriceHistory: (id: string) => apiFetch<PriceHistoryEntryDto[]>(`/api/items/${id}/price-history`),
  searchItems: (q: string) => apiFetch<ItemSuggestionDto[]>(`/api/items/search?q=${encodeURIComponent(q)}`),

  getBills: (month: string) => apiFetch<BillsMonthDto>(`/api/bills?month=${month}`),
  markBillPaid: (id: string) => apiFetch<void>(`/api/bills/${id}/mark-paid`, { method: "POST" }),
  getBillTemplates: () => apiFetch<BillTemplateDto[]>("/api/bill-templates"),
  createBillTemplate: (req: CreateBillTemplateRequest) =>
    apiFetch<BillTemplateDto>("/api/bill-templates", { method: "POST", body: JSON.stringify(req) }),
  updateBillTemplate: (id: string, req: UpdateBillTemplateRequest) =>
    apiFetch<void>(`/api/bill-templates/${id}`, { method: "PATCH", body: JSON.stringify(req) }),
  deleteBillTemplate: (id: string) => apiFetch<void>(`/api/bill-templates/${id}`, { method: "DELETE" }),

  getMenu: (from: string, to: string) => apiFetch<MenuEntryDto[]>(`/api/menu?from=${from}&to=${to}`),
  upsertMenuEntry: (req: UpsertMenuEntryRequest) => apiFetch<MenuEntryDto>("/api/menu", { method: "POST", body: JSON.stringify(req) }),
  addSubstitution: (menuEntryId: string, req: CreateSubstitutionRequest) =>
    apiFetch<SubstitutionDto>(`/api/menu/${menuEntryId}/substitutions`, { method: "POST", body: JSON.stringify(req) }),
  deleteSubstitution: (id: string) => apiFetch<void>(`/api/substitutions/${id}`, { method: "DELETE" }),
  getRecipes: () => apiFetch<RecipeDto[]>("/api/recipes"),
  createRecipe: (req: CreateRecipeRequest) => apiFetch<RecipeDto>("/api/recipes", { method: "POST", body: JSON.stringify(req) }),
  updateRecipe: (id: string, req: UpdateRecipeRequest) => apiFetch<void>(`/api/recipes/${id}`, { method: "PATCH", body: JSON.stringify(req) }),

  getUsers: () => apiFetch<UserDto[]>("/api/users"),
  createUser: (req: CreateUserRequest) => apiFetch<UserDto>("/api/users", { method: "POST", body: JSON.stringify(req) }),
  updateUser: (id: string, req: UpdateUserRequest) => apiFetch<void>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(req) }),
  deleteUser: (id: string) => apiFetch<void>(`/api/users/${id}`, { method: "DELETE" }),
  setUserPin: (id: string, req: SetPinRequest) => apiFetch<void>(`/api/users/${id}/pin`, { method: "POST", body: JSON.stringify(req) }),
  sendAccountEmail: (id: string) => apiFetch<void>(`/api/users/${id}/send-account-email`, { method: "POST" }),
  getDietaryTags: (userId: string) => apiFetch<DietaryTagDto[]>(`/api/users/${userId}/dietary-tags`),
  addDietaryTag: (userId: string, req: CreateDietaryTagRequest) =>
    apiFetch<DietaryTagDto>(`/api/users/${userId}/dietary-tags`, { method: "POST", body: JSON.stringify(req) }),
  deleteDietaryTag: (userId: string, tagId: string) => apiFetch<void>(`/api/users/${userId}/dietary-tags/${tagId}`, { method: "DELETE" }),

  getVapidPublicKey: () => apiFetch<VapidPublicKeyDto>("/api/push/vapid-public-key"),
  subscribeToPush: (req: SubscribeToPushRequest) => apiFetch<void>("/api/push/subscribe", { method: "POST", body: JSON.stringify(req) }),
  unsubscribeFromPush: (req: UnsubscribeFromPushRequest) =>
    apiFetch<void>("/api/push/unsubscribe", { method: "POST", body: JSON.stringify(req) }),
};
