import { useState } from "react";
import {
  useCreateUser,
  useDeleteUser,
  useSendAccountEmail,
  useSetUserPin,
  useUpdateUser,
  type Role,
  type UserDto,
} from "@chaos-coordinator/core";

const ROLES: Role[] = ["Adult", "Child", "Other"];
const COLOR_CHOICES = ["#FF6B57", "#4C8BF5", "#1FB6A6", "#F2A93B", "#9B6BD9", "#E8607A"];

interface UserEditModalProps {
  user: UserDto | null; // null = creating
  order: number;
  onClose: () => void;
}

export function UserEditModal({ user, order, onClose }: UserEditModalProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [initials, setInitials] = useState(user?.initials ?? "");
  const [color, setColor] = useState(user?.color ?? COLOR_CHOICES[0]);
  const [role, setRole] = useState<Role>(user?.role ?? "Child");
  const [email, setEmail] = useState(user?.email ?? "");
  const [pin, setPin] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const setUserPin = useSetUserPin();
  const sendAccountEmail = useSendAccountEmail();

  async function handleSave() {
    setSaveError(null);
    const req = { name, initials: initials.toUpperCase().slice(0, 3), color, role, order, email: email.trim() || null };
    try {
      if (user) {
        await updateUser.mutateAsync({ id: user.id, req });
      } else {
        await createUser.mutateAsync(req);
      }
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  }

  async function handleSetPin() {
    if (!user || pin.length !== 4) return;
    await setUserPin.mutateAsync({ id: user.id, req: { pin } });
    setPin("");
  }

  async function handleSendAccountEmail() {
    if (!user) return;
    setEmailSent(false);
    try {
      await sendAccountEmail.mutateAsync(user.id);
      setEmailSent(true);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Couldn't send that email — please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center" onClick={onClose}>
      <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-t-card-lg bg-app p-6 sm:rounded-card-lg" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-extrabold text-ink">{user ? "Edit person" : "Add person"}</div>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink" />
          </label>
          <label className="flex w-20 flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Initials</span>
            <input value={initials} onChange={(e) => setInitials(e.target.value)} maxLength={3} className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink" />
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Color</span>
          <div className="flex gap-2">
            {COLOR_CHOICES.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full ${color === c ? "ring-2 ring-ink ring-offset-2" : ""}`} style={{ background: c }} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Role</span>
          <div className="flex gap-2">
            {ROLES.map((r) => (
              <button key={r} onClick={() => setRole(r)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${role === r ? "bg-ink text-white" : "bg-chip text-ink-muted"}`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {role !== "Child" && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
            />
          </label>
        )}

        {user && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
              Set 4-digit PIN <span className="normal-case font-medium text-ink-fainter">(wall display login)</span>
            </span>
            <div className="flex gap-2">
              <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="••••" className="flex-1 rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink" />
              <button onClick={handleSetPin} disabled={pin.length !== 4} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">
                Set
              </button>
            </div>
          </div>
        )}

        {user && role !== "Child" && user.email && (
          <div className="flex items-center justify-between rounded-xl bg-chip px-3.5 py-3">
            <div>
              <div className="text-sm font-bold text-ink">
                {user.emailVerified ? "Reset password" : "Welcome email"}
              </div>
              <div className="text-[11px] font-medium text-ink-faint">
                {emailSent ? "Sent!" : `Emails a set-password link to ${user.email}`}
              </div>
            </div>
            <button
              onClick={handleSendAccountEmail}
              disabled={sendAccountEmail.isPending}
              className="rounded-xl bg-ink px-3.5 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              {user.emailVerified ? "Send reset" : "Send invite"}
            </button>
          </div>
        )}

        {saveError && (
          <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">{saveError}</div>
        )}

        <div className="mt-2 flex gap-3">
          {user && (
            <button
              onClick={async () => {
                await deleteUser.mutateAsync(user.id);
                onClose();
              }}
              className="flex-1 rounded-2xl border border-cat-doctor py-3 text-sm font-bold text-cat-doctor"
            >
              Remove
            </button>
          )}
          <button onClick={handleSave} disabled={!name.trim()} className="flex-1 rounded-2xl bg-ink py-3 text-sm font-bold text-white disabled:opacity-50">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
