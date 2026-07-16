import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const FIELD_CLASS =
  "peer w-full rounded-xl border border-border-strong bg-card px-3 pb-2 pt-5 text-sm font-semibold text-ink placeholder-transparent";

const LABEL_CLASS =
  "pointer-events-none absolute left-3 top-1.5 text-[9px] font-bold uppercase tracking-wide text-ink-faint " +
  "transition-all duration-100 " +
  "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm " +
  "peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal";

type FloatingInputProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

/** Text/date/time/number input whose label collapses into small caps once the field has a value —
 * pure-CSS via `:placeholder-shown`, so it needs `placeholder=" "` (not empty) on the input to
 * work for types that don't render a visible placeholder (date/time). */
export function FloatingInput({ label, className, ...props }: FloatingInputProps) {
  return (
    <div className="relative">
      <input placeholder=" " className={`${FIELD_CLASS} ${className ?? ""}`} {...props} />
      <label className={LABEL_CLASS}>{label}</label>
    </div>
  );
}

type FloatingTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string };

export function FloatingTextarea({ label, className, ...props }: FloatingTextareaProps) {
  return (
    <div className="relative">
      <textarea placeholder=" " className={`${FIELD_CLASS} resize-none ${className ?? ""}`} {...props} />
      <label className={LABEL_CLASS}>{label}</label>
    </div>
  );
}
