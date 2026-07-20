import type { ReactNode } from "react";

function CancelIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 10.5l3.5 3.5L16 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface FormHeaderProps {
  title: string;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
  /** Optional icon button rendered right next to the title — e.g. the "create from a photo"
   * entry point on the New Event screen. */
  titleAction?: { icon: ReactNode; label: string; onClick: () => void };
}

/** Icon-button header bar for full-page forms — Cancel (X) / title / Save (✓). */
export function FormHeader({ title, onCancel, onSave, saveDisabled, saveLabel = "Save", titleAction }: FormHeaderProps) {
  return (
    <div className="flex flex-none items-center justify-between border-b border-border px-3 py-3">
      <button
        onClick={onCancel}
        aria-label="Cancel"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-chip"
      >
        <CancelIcon />
      </button>
      <div className="flex items-center gap-1.5">
        <div className="text-base font-extrabold text-ink">{title}</div>
        {titleAction && (
          <button
            onClick={titleAction.onClick}
            aria-label={titleAction.label}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:bg-chip"
          >
            {titleAction.icon}
          </button>
        )}
      </div>
      <button
        onClick={onSave}
        disabled={saveDisabled}
        aria-label={saveLabel}
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-chip disabled:opacity-30"
      >
        <SaveIcon />
      </button>
    </div>
  );
}
