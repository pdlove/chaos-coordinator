import { useEffect, useState } from "react";
import {
  ApiError,
  useConfirmBillPhotoImport,
  useCreateBillTemplate,
  useHousehold,
  useSessionStore,
  type BillMatchCandidateDto,
  type ConfirmBillPhotoImportRequest,
  type ExtractBillPhotoResponse,
} from "@chaos-coordinator/core";
import { StatusBadge } from "../../../components/StatusBadge";
import { PinPrompt } from "../../../components/PinPrompt";

interface BillPhotoReviewScreenProps {
  extraction: ExtractBillPhotoResponse;
  sourceImages: File[];
  onRetake: () => void;
  onDone: () => void;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function dateLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });
}

function describeConfirmError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return "This scan was already attached to a bill.";
    return `Couldn't save that (server returned ${err.status}). Try again.`;
  }
  return "Couldn't reach the server — check your connection and try again.";
}

type CreateMode = "template" | "newRecurring" | "oneOff" | null;

/** Review step of "scan a bill": shows what the AI read off the photo(s), then always requires an
 * explicit tap — either on one of the suggested matches, or on "attach to a recurring bill" /
 * "create a new recurring bill" / "create a one-off bill" — before anything is attached. Nothing
 * here is ever auto-selected. */
export function BillPhotoReviewScreen({ extraction, sourceImages, onRetake, onDone }: BillPhotoReviewScreenProps) {
  const { data: household } = useHousehold();
  const pinElevated = useSessionStore((s) => s.pinElevated);
  const confirm = useConfirmBillPhotoImport();
  const createTemplate = useCreateBillTemplate();

  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultDueDate = extraction.extractedDueDate ?? todayIso();
  const defaultDueDay = extraction.extractedDueDate ? new Date(`${extraction.extractedDueDate}T00:00:00`).getDate() : 1;

  const [templateId, setTemplateId] = useState("");
  const [templateDueDate, setTemplateDueDate] = useState(defaultDueDate);

  const [newRecurringTitle, setNewRecurringTitle] = useState(extraction.extractedTitle ?? "");
  const [newRecurringManagedById, setNewRecurringManagedById] = useState("");
  const [newRecurringDueDay, setNewRecurringDueDay] = useState(defaultDueDay);
  const [newRecurringAmount, setNewRecurringAmount] = useState(extraction.extractedAmount != null ? String(extraction.extractedAmount) : "");
  const [newRecurringAccountNumber, setNewRecurringAccountNumber] = useState(extraction.extractedAccountNumber ?? "");

  const [oneOffTitle, setOneOffTitle] = useState(extraction.extractedTitle ?? "");
  const [oneOffManagedById, setOneOffManagedById] = useState("");
  const [oneOffDueDate, setOneOffDueDate] = useState(defaultDueDate);
  const [oneOffAmount, setOneOffAmount] = useState(extraction.extractedAmount != null ? String(extraction.extractedAmount) : "");
  const [oneOffAccountNumber, setOneOffAccountNumber] = useState(extraction.extractedAccountNumber ?? "");

  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([]);
  useEffect(() => {
    const urls = sourceImages.map((file) => URL.createObjectURL(file));
    setThumbnailUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [sourceImages]);

  useEffect(() => {
    if (!household || household.users.length === 0) return;
    if (!oneOffManagedById) setOneOffManagedById(household.users[0].id);
    if (!newRecurringManagedById) setNewRecurringManagedById(household.users[0].id);
    if (!templateId && extraction.activeTemplates.length > 0) setTemplateId(extraction.activeTemplates[0].id);
  }, [household, extraction.activeTemplates, oneOffManagedById, newRecurringManagedById, templateId]);

  async function doConfirm(payload: ConfirmBillPhotoImportRequest) {
    setConfirmError(null);
    setSaving(true);
    try {
      await confirm.mutateAsync(payload);
      onDone();
    } catch (err) {
      setConfirmError(describeConfirmError(err));
    } finally {
      setSaving(false);
    }
  }

  async function doCreateRecurringAndAttach() {
    if (!newRecurringTitle.trim() || !newRecurringManagedById) return;
    setConfirmError(null);
    setSaving(true);
    try {
      const template = await createTemplate.mutateAsync({
        title: newRecurringTitle.trim(),
        managedById: newRecurringManagedById,
        dueDay: newRecurringDueDay,
        amount: newRecurringAmount ? parseFloat(newRecurringAmount) : null,
        amountMin: null,
        amountMax: null,
        accountNumber: newRecurringAccountNumber.trim() || null,
      });
      await confirm.mutateAsync({
        batchId: extraction.batchId,
        existingBillId: null,
        templateId: template.id,
        templateDueDate: defaultDueDate,
        newOneOff: null,
      });
      onDone();
    } catch (err) {
      setConfirmError(describeConfirmError(err));
    } finally {
      setSaving(false);
    }
  }

  function runAction(action: () => void) {
    if (pinElevated) action();
    else setPendingAction(() => action);
  }

  function confirmMatch(match: BillMatchCandidateDto) {
    runAction(() =>
      void doConfirm({ batchId: extraction.batchId, existingBillId: match.id, templateId: null, templateDueDate: null, newOneOff: null })
    );
  }

  function confirmTemplate() {
    if (!templateId || !templateDueDate) return;
    runAction(() =>
      void doConfirm({ batchId: extraction.batchId, existingBillId: null, templateId, templateDueDate, newOneOff: null })
    );
  }

  function confirmNewRecurring() {
    if (!newRecurringTitle.trim() || !newRecurringManagedById) return;
    runAction(() => void doCreateRecurringAndAttach());
  }

  function confirmOneOff() {
    if (!oneOffTitle.trim() || !oneOffManagedById || !oneOffDueDate) return;
    runAction(() =>
      void doConfirm({
        batchId: extraction.batchId,
        existingBillId: null,
        templateId: null,
        templateDueDate: null,
        newOneOff: {
          title: oneOffTitle.trim(),
          managedById: oneOffManagedById,
          dueDate: oneOffDueDate,
          amount: oneOffAmount ? parseFloat(oneOffAmount) : null,
          amountMin: null,
          amountMax: null,
          accountNumber: oneOffAccountNumber.trim() || null,
        },
      })
    );
  }

  const readSomething =
    extraction.extractedTitle || extraction.extractedAmount != null || extraction.extractedDueDate || extraction.extractedAccountNumber;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app">
      <div className="flex flex-none items-center justify-between border-b border-border px-3 py-3">
        <button onClick={onRetake} className="px-2 text-sm font-bold text-ink-muted">
          ‹ Retake
        </button>
        <div className="text-base font-extrabold text-ink">Confirm bill</div>
        <button onClick={onDone} aria-label="Close" className="px-2 text-sm font-bold text-ink-muted">
          Cancel
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        {thumbnailUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {thumbnailUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="h-16 w-16 overflow-hidden rounded-xl bg-chip">
                <img src={url} alt="" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        )}

        <div className="rounded-xl bg-chip px-3.5 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">We read</div>
          {readSomething ? (
            <div className="mt-1 text-sm font-semibold text-ink">
              {extraction.extractedTitle ?? "Unknown payee"}
              {extraction.extractedAmount != null && ` · $${extraction.extractedAmount.toLocaleString()}`}
              {extraction.extractedDueDate && ` · due ${dateLabel(extraction.extractedDueDate)}`}
              {extraction.extractedAccountNumber && ` · acct ${extraction.extractedAccountNumber}`}
            </div>
          ) : (
            <div className="mt-1 text-sm font-semibold text-ink">Couldn't read this bill clearly — pick or create one below.</div>
          )}
        </div>

        {extraction.matches.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Looks like one of these?</span>
            {extraction.matches.map((match) => (
              <button
                key={match.id}
                onClick={() => confirmMatch(match)}
                className={`flex items-center justify-between rounded-xl bg-card p-3 text-left shadow-sm ${
                  match.isBestGuess ? "ring-2 ring-ink" : ""
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-ink">{match.title}</div>
                  <div className="mt-0.5 text-[11.5px] font-medium text-ink-muted">
                    due {dateLabel(match.dueDate)}
                    {match.amount != null && ` · $${match.amount.toLocaleString()}`}
                    {match.isBestGuess && " · best guess"}
                  </div>
                </div>
                <StatusBadge status={match.status} />
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Or create new</span>

          <div className="flex gap-2">
            <button
              onClick={() => setCreateMode(createMode === "template" ? null : "template")}
              className={`flex-1 rounded-xl border-[1.5px] border-dashed py-3 text-center text-xs font-bold ${
                createMode === "template" ? "border-ink text-ink" : "border-ink-fainter text-ink-muted"
              }`}
            >
              Attach to a recurring bill
            </button>
            <button
              onClick={() => setCreateMode(createMode === "newRecurring" ? null : "newRecurring")}
              className={`flex-1 rounded-xl border-[1.5px] border-dashed py-3 text-center text-xs font-bold ${
                createMode === "newRecurring" ? "border-ink text-ink" : "border-ink-fainter text-ink-muted"
              }`}
            >
              Create a new recurring bill
            </button>
          </div>
          <button
            onClick={() => setCreateMode(createMode === "oneOff" ? null : "oneOff")}
            className={`rounded-xl border-[1.5px] border-dashed py-3 text-center text-xs font-bold ${
              createMode === "oneOff" ? "border-ink text-ink" : "border-ink-fainter text-ink-muted"
            }`}
          >
            Create a one-off bill
          </button>

          {createMode === "template" && (
            <div className="flex flex-col gap-3 rounded-xl bg-chip p-3.5">
              {extraction.activeTemplates.length === 0 ? (
                <div className="text-xs font-medium text-ink-muted">No recurring bills set up yet.</div>
              ) : (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Recurring bill</span>
                    <select
                      value={templateId}
                      onChange={(e) => setTemplateId(e.target.value)}
                      className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                    >
                      {extraction.activeTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Due date</span>
                    <input
                      type="date"
                      value={templateDueDate}
                      onChange={(e) => setTemplateDueDate(e.target.value)}
                      className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                    />
                  </label>
                  <button onClick={confirmTemplate} className="rounded-2xl bg-ink py-3 text-sm font-bold text-white">
                    Attach{pinElevated ? "" : " (PIN)"}
                  </button>
                </>
              )}
            </div>
          )}

          {createMode === "newRecurring" && (
            <div className="flex flex-col gap-3 rounded-xl bg-chip p-3.5">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Title</span>
                <input
                  value={newRecurringTitle}
                  onChange={(e) => setNewRecurringTitle(e.target.value)}
                  placeholder="Electric"
                  className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                />
              </label>
              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Managed by</span>
                  <select
                    value={newRecurringManagedById}
                    onChange={(e) => setNewRecurringManagedById(e.target.value)}
                    className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                  >
                    {household?.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Due day</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={newRecurringDueDay}
                    onChange={(e) => setNewRecurringDueDay(Number(e.target.value))}
                    className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Amount</span>
                <input
                  value={newRecurringAmount}
                  onChange={(e) => setNewRecurringAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="$0.00"
                  className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Account number (optional)</span>
                <input
                  value={newRecurringAccountNumber}
                  onChange={(e) => setNewRecurringAccountNumber(e.target.value)}
                  placeholder="1234567890"
                  className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                />
              </label>
              <button onClick={confirmNewRecurring} className="rounded-2xl bg-ink py-3 text-sm font-bold text-white">
                Create & attach{pinElevated ? "" : " (PIN)"}
              </button>
            </div>
          )}

          {createMode === "oneOff" && (
            <div className="flex flex-col gap-3 rounded-xl bg-chip p-3.5">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Title</span>
                <input
                  value={oneOffTitle}
                  onChange={(e) => setOneOffTitle(e.target.value)}
                  placeholder="Vet visit"
                  className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                />
              </label>
              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Managed by</span>
                  <select
                    value={oneOffManagedById}
                    onChange={(e) => setOneOffManagedById(e.target.value)}
                    className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                  >
                    {household?.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Due date</span>
                  <input
                    type="date"
                    value={oneOffDueDate}
                    onChange={(e) => setOneOffDueDate(e.target.value)}
                    className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Amount</span>
                <input
                  value={oneOffAmount}
                  onChange={(e) => setOneOffAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="$0.00"
                  className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Account number (optional)</span>
                <input
                  value={oneOffAccountNumber}
                  onChange={(e) => setOneOffAccountNumber(e.target.value)}
                  placeholder="1234567890"
                  className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                />
              </label>
              <button onClick={confirmOneOff} className="rounded-2xl bg-ink py-3 text-sm font-bold text-white">
                Create & attach{pinElevated ? "" : " (PIN)"}
              </button>
            </div>
          )}
        </div>

        {confirmError && <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">{confirmError}</div>}
        {saving && <div className="text-center text-sm font-medium text-ink-muted">Saving…</div>}
      </div>

      {pendingAction && (
        <PinPrompt
          onCancel={() => setPendingAction(null)}
          onSuccess={() => {
            const action = pendingAction;
            setPendingAction(null);
            action?.();
          }}
        />
      )}
    </div>
  );
}
