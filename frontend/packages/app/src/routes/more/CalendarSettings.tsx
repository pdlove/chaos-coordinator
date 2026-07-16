import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ApiError,
  useCalendarCategories,
  useCreateCalendarCategory,
  useCreateSavedLocation,
  useDeleteCalendarCategory,
  useDeleteSavedLocation,
  useSavedLocations,
  useUpdateCalendarCategory,
  useUpdateSavedLocation,
} from "@chaos-coordinator/core";

const COLOR_CHOICES = ["#FF6B57", "#4C8BF5", "#1FB6A6", "#F2A93B", "#9B6BD9", "#E8607A"];

function isCategoryInUseError(err: unknown): boolean {
  return err instanceof ApiError && (err.body as { error?: string } | null)?.error === "category_in_use";
}

/** Parent-only settings — route entry is PIN-gated by MorePage/PhoneApp routing conventions. */
export function CalendarSettings() {
  const navigate = useNavigate();

  const { data: categories } = useCalendarCategories();
  const createCategory = useCreateCalendarCategory();
  const updateCategory = useUpdateCalendarCategory();
  const deleteCategory = useDeleteCalendarCategory();

  const { data: locations } = useSavedLocations();
  const createLocation = useCreateSavedLocation();
  const updateLocation = useUpdateSavedLocation();
  const deleteLocation = useDeleteSavedLocation();

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  async function handleDeleteCategory(id: string) {
    setCategoryError(null);
    try {
      await deleteCategory.mutateAsync(id);
    } catch (err) {
      setCategoryError(
        isCategoryInUseError(err)
          ? "That category is still used by an event — remove it from those events first."
          : "Couldn't delete — please try again."
      );
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none items-center gap-2.5 px-5 pb-1 pt-1.5">
        <button onClick={() => navigate("/more")} className="text-lg">
          ←
        </button>
        <span className="text-xl font-extrabold text-ink">Categories &amp; Locations</span>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-5 pt-2.5">
        <div className="flex flex-col gap-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Calendar categories</div>

          {categoryError && (
            <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">
              {categoryError}
            </div>
          )}

          {categories?.map((c) => (
            <div key={c.id} className="flex flex-col gap-2 rounded-card bg-card p-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <input
                  defaultValue={c.name}
                  onBlur={(e) =>
                    e.target.value.trim() &&
                    e.target.value !== c.name &&
                    updateCategory.mutate({ id: c.id, req: { name: e.target.value.trim(), color: c.color, order: c.order } })
                  }
                  className="flex-1 bg-transparent text-sm font-bold text-ink outline-none"
                />
                <button
                  onClick={() => handleDeleteCategory(c.id)}
                  aria-label="Remove category"
                  className="text-xs font-bold text-cat-doctor"
                >
                  Remove
                </button>
              </div>
              <div className="flex gap-1.5">
                {COLOR_CHOICES.map((swatch) => (
                  <button
                    key={swatch}
                    onClick={() =>
                      swatch !== c.color &&
                      updateCategory.mutate({ id: c.id, req: { name: c.name, color: swatch, order: c.order } })
                    }
                    aria-label={`Set color ${swatch}`}
                    className={`h-6 w-6 rounded-full ${swatch === c.color ? "ring-2 ring-ink ring-offset-2" : ""}`}
                    style={{ background: swatch }}
                  />
                ))}
              </div>
            </div>
          ))}

          {showNewCategory ? (
            <div className="flex items-center gap-2 rounded-card bg-card p-3.5 shadow-sm">
              <input
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                className="flex-1 bg-transparent text-sm font-bold text-ink outline-none"
              />
              <button
                onClick={() => {
                  if (!newCategoryName.trim()) return;
                  createCategory.mutate({
                    name: newCategoryName.trim(),
                    color: COLOR_CHOICES[(categories?.length ?? 0) % COLOR_CHOICES.length],
                    order: categories?.length ?? 0,
                  });
                  setNewCategoryName("");
                  setShowNewCategory(false);
                }}
                className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewCategory(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-ink-fainter text-sm font-bold text-ink-muted"
            >
              + Add category
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Saved locations</div>
          <div className="text-xs font-medium text-ink-muted">
            Suggested on the event form's Location field — you can still type anything new there.
          </div>

          {locations?.map((l) => (
            <div key={l.id} className="flex flex-col gap-1.5 rounded-card bg-card p-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <input
                  defaultValue={l.name}
                  onBlur={(e) =>
                    e.target.value.trim() &&
                    e.target.value !== l.name &&
                    updateLocation.mutate({ id: l.id, req: { name: e.target.value.trim(), address: l.address, order: l.order } })
                  }
                  placeholder="Name"
                  className="flex-1 bg-transparent text-sm font-bold text-ink outline-none"
                />
                <button
                  onClick={() => deleteLocation.mutate(l.id)}
                  aria-label="Remove location"
                  className="text-xs font-bold text-cat-doctor"
                >
                  Remove
                </button>
              </div>
              <input
                defaultValue={l.address ?? ""}
                onBlur={(e) =>
                  e.target.value !== (l.address ?? "") &&
                  updateLocation.mutate({ id: l.id, req: { name: l.name, address: e.target.value.trim() || null, order: l.order } })
                }
                placeholder="Address (optional)"
                className="bg-transparent text-xs font-medium text-ink-muted outline-none"
              />
            </div>
          ))}

          {showNewLocation ? (
            <div className="flex flex-col gap-1.5 rounded-card bg-card p-3.5 shadow-sm">
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="Name"
                  className="flex-1 bg-transparent text-sm font-bold text-ink outline-none"
                />
                <button
                  onClick={() => {
                    if (!newLocationName.trim()) return;
                    createLocation.mutate({
                      name: newLocationName.trim(),
                      address: newLocationAddress.trim() || null,
                      order: locations?.length ?? 0,
                    });
                    setNewLocationName("");
                    setNewLocationAddress("");
                    setShowNewLocation(false);
                  }}
                  className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white"
                >
                  Add
                </button>
              </div>
              <input
                value={newLocationAddress}
                onChange={(e) => setNewLocationAddress(e.target.value)}
                placeholder="Address (optional)"
                className="bg-transparent text-xs font-medium text-ink-muted outline-none"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowNewLocation(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-ink-fainter text-sm font-bold text-ink-muted"
            >
              + Add location
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
