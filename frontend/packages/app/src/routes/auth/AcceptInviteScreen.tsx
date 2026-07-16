import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAcceptInvite } from "@chaos-coordinator/core";

export function AcceptInviteScreen() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const acceptInvite = useAcceptInvite();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      await acceptInvite.mutateAsync({ token, password });
      // On success the session is established — PhoneApp swaps to the authenticated view.
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "That invite link didn't work — it may have expired.");
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app px-6 text-center text-sm font-medium text-ink-muted">
        This invite link is missing its token.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-7 bg-app px-6">
      <div className="text-center">
        <div className="text-2xl font-extrabold text-ink">You're invited!</div>
        <div className="mt-1 text-sm font-medium text-ink-muted">Set a password to finish joining</div>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-[340px] flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            autoFocus
          />
        </label>

        {error && (
          <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">{error}</div>
        )}

        <button
          type="submit"
          disabled={acceptInvite.isPending || !password}
          className="rounded-2xl bg-ink py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          Join Family
        </button>
      </form>
    </div>
  );
}
