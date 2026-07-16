import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "@chaos-coordinator/core";
import type { Role } from "@chaos-coordinator/shared";
import { Turnstile } from "../../components/Turnstile";

const MAX_ADDITIONAL_MEMBERS = 6;
const ROLES: Role[] = ["Adult", "Child", "Other"];

interface MemberDraft {
  name: string;
  role: Role;
  email: string;
  sendInvite: boolean;
}

function emptyMember(role: Role = "Adult"): MemberDraft {
  return { name: "", role, email: "", sendInvite: true };
}

export function RegisterScreen() {
  const navigate = useNavigate();
  const register = useRegister();

  const [familyName, setFamilyName] = useState("");
  const [firstAdultName, setFirstAdultName] = useState("");
  const [firstAdultEmail, setFirstAdultEmail] = useState("");
  const [firstAdultPassword, setFirstAdultPassword] = useState("");
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  function updateMember(index: number, patch: Partial<MemberDraft>) {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  function addMember() {
    if (members.length >= MAX_ADDITIONAL_MEMBERS) return;
    // After two adults (first adult + one more), or right after a Child row, default to Child —
    // most households add all their kids in a row once both parents are on the account.
    const lastRole = members.length > 0 ? members[members.length - 1].role : null;
    const adultCount = 1 + members.filter((m) => m.role === "Adult").length;
    const defaultRole: Role = lastRole === "Child" || adultCount >= 2 ? "Child" : "Adult";
    setMembers((prev) => [...prev, emptyMember(defaultRole)]);
  }

  function removeMember(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (firstAdultPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    for (const m of members) {
      if (!m.name.trim()) {
        setError("Every additional member needs a name.");
        return;
      }
      if (m.role !== "Child" && m.sendInvite && !m.email.trim()) {
        setError(`${m.name || "That member"} needs an email so we can send them an invite.`);
        return;
      }
    }

    try {
      await register.mutateAsync({
        familyName,
        firstAdultName,
        firstAdultEmail,
        firstAdultPassword,
        additionalMembers: members.map((m) => ({
          name: m.name.trim(),
          role: m.role,
          email: m.role === "Child" ? null : m.email.trim() || null,
          sendInvite: m.role !== "Child" && m.sendInvite,
        })),
        turnstileToken,
      });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-app px-6 text-center">
        <div className="text-2xl font-extrabold text-ink">Welcome to Chaos Coordinator!</div>
        <div className="max-w-[320px] text-sm font-medium text-ink-muted">
          We sent a verification link to {firstAdultEmail}. Anyone else you added with an email will get their own
          invite to set up a password.
        </div>
        <button onClick={() => navigate("/")} className="rounded-2xl bg-ink px-6 py-3 text-sm font-bold text-white">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-7 bg-app px-6 py-10">
      <div className="text-center">
        <div className="text-2xl font-extrabold text-ink">Family Registration</div>
        <div className="mt-1 text-sm font-medium text-ink-muted">Set up your household</div>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-[420px] flex-col gap-5">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Family Name</span>
          <input
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
            placeholder="The Smiths"
            autoFocus
          />
        </label>

        <div className="flex flex-col gap-3 rounded-2xl bg-card p-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">You (first adult)</div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Name</span>
            <input
              value={firstAdultName}
              onChange={(e) => setFirstAdultName(e.target.value)}
              className="rounded-xl border border-border-strong bg-app px-3 py-2.5 text-sm font-semibold text-ink"
              placeholder="Jamie Smith"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Email</span>
            <input
              type="email"
              value={firstAdultEmail}
              onChange={(e) => setFirstAdultEmail(e.target.value)}
              className="rounded-xl border border-border-strong bg-app px-3 py-2.5 text-sm font-semibold text-ink"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Password</span>
            <input
              type="password"
              value={firstAdultPassword}
              onChange={(e) => setFirstAdultPassword(e.target.value)}
              className="rounded-xl border border-border-strong bg-app px-3 py-2.5 text-sm font-semibold text-ink"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
            Other family members ({members.length}/{MAX_ADDITIONAL_MEMBERS})
          </span>

          {members.map((m, i) => (
            <div key={i} className="flex flex-col gap-2.5 rounded-2xl bg-card p-4">
              <div className="flex items-center gap-2">
                <input
                  value={m.name}
                  onChange={(e) => updateMember(i, { name: e.target.value })}
                  className="w-0 flex-1 rounded-xl border border-border-strong bg-app px-3 py-2 text-sm font-semibold text-ink"
                  placeholder="Name"
                />
                <select
                  value={m.role}
                  onChange={(e) => updateMember(i, { role: e.target.value as Role })}
                  className="shrink-0 rounded-xl border border-border-strong bg-app px-2 py-2 text-sm font-semibold text-ink"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeMember(i)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-bold text-cat-doctor"
                  aria-label="Remove member"
                >
                  ×
                </button>
              </div>
              {m.role !== "Child" && (
                <div className="flex flex-col gap-1.5">
                  <input
                    type="email"
                    value={m.email}
                    onChange={(e) => updateMember(i, { email: e.target.value })}
                    className="rounded-xl border border-border-strong bg-app px-3 py-2 text-sm font-semibold text-ink"
                    placeholder="Email — we'll send an invite"
                  />
                  <label className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
                    <input
                      type="checkbox"
                      checked={!m.sendInvite}
                      onChange={(e) => updateMember(i, { sendInvite: !e.target.checked })}
                    />
                    Don't send invitation
                  </label>
                </div>
              )}
            </div>
          ))}

          {members.length < MAX_ADDITIONAL_MEMBERS && (
            <button type="button" onClick={addMember} className="self-start text-xs font-bold text-ink">
              + Add member
            </button>
          )}
        </div>

        <Turnstile onVerify={setTurnstileToken} />

        {error && (
          <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">{error}</div>
        )}

        <button
          type="submit"
          disabled={
            register.isPending ||
            !familyName.trim() ||
            !firstAdultName.trim() ||
            !firstAdultEmail.trim() ||
            turnstileToken === null
          }
          className="rounded-2xl bg-ink py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          Create Family Account
        </button>

        <Link to="/" className="text-center text-sm font-semibold text-ink-muted">
          Already have an account? Sign in
        </Link>
      </form>
    </div>
  );
}
