import { useEffect, useState } from "react";
import { useCalendarCategories, useHousehold } from "@chaos-coordinator/core";
import { FormHeader } from "../../../components/FormHeader";
import { CategorySelectPills } from "../../../components/CategorySelectPills";
import { AttendeePillPicker } from "../../../components/AttendeePillPicker";
import { RemindersPickerScreen, formatReminderMinutes } from "../RemindersPickerScreen";

export interface ImportDefaults {
  categoryId: string;
  attendeeUserIds: string[];
  reminderMinutes: number[];
}

interface ImportDefaultsScreenProps {
  onCancel: () => void;
  onNext: (defaults: ImportDefaults) => void;
}

function remindersSummary(minutes: number[]): string {
  return minutes.length === 0 ? "None" : minutes.map(formatReminderMinutes).join(", ");
}

/** First step of the "create events from a photo" flow — pick the defaults every extracted
 * candidate starts with (still editable per-candidate on the review screen). */
export function ImportDefaultsScreen({ onCancel, onNext }: ImportDefaultsScreenProps) {
  const { data: household } = useHousehold();
  const { data: categories } = useCalendarCategories();

  const [categoryId, setCategoryId] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [reminderMinutes, setReminderMinutes] = useState<number[]>([]);
  const [showRemindersPicker, setShowRemindersPicker] = useState(false);

  useEffect(() => {
    if (!categoryId && categories && categories.length > 0) setCategoryId(categories[0].id);
  }, [categoryId, categories]);

  function toggleAttendee(userId: string) {
    setAttendeeIds((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app">
      <FormHeader
        title="Create from a photo"
        onCancel={onCancel}
        onSave={() => onNext({ categoryId, attendeeUserIds: attendeeIds, reminderMinutes })}
        saveLabel="Next"
        saveDisabled={!categoryId}
      />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        <div className="text-sm font-medium text-ink-muted">
          Pick the defaults new events should start with — you can still edit each one before creating.
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Category</span>
          <CategorySelectPills categories={categories ?? []} value={categoryId} onChange={setCategoryId} />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Participants</span>
          <AttendeePillPicker users={household?.users ?? []} selectedIds={attendeeIds} onToggle={toggleAttendee} />
        </div>

        <button
          onClick={() => setShowRemindersPicker(true)}
          className="flex items-center justify-between rounded-xl bg-card px-3.5 py-3 text-left"
        >
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Reminders</span>
          <span className="text-sm font-semibold text-ink">{remindersSummary(reminderMinutes)}</span>
        </button>
      </div>

      {showRemindersPicker && (
        <RemindersPickerScreen
          initialMinutes={reminderMinutes}
          onCancel={() => setShowRemindersPicker(false)}
          onSave={(minutes) => {
            setReminderMinutes(minutes);
            setShowRemindersPicker(false);
          }}
        />
      )}
    </div>
  );
}
