import { useState } from "react";
import { useHousehold, useLogin } from "@chaos-coordinator/core";
import type { UserDto } from "@chaos-coordinator/shared";
import { Avatar } from "../../components/Avatar";
import { PinPad } from "../../components/PinPad";

export function LoginScreen() {
  const { data: household, isLoading, isError } = useHousehold();
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const login = useLogin();

  if (isLoading) {
    return <Centered text="Loading…" />;
  }

  if (isError || !household) {
    return <Centered text="Couldn't reach the server. Is it running?" />;
  }

  if (selectedUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-7 bg-app px-6">
        <button
          onClick={() => { setSelectedUser(null); login.reset(); }}
          className="absolute left-5 top-5 text-sm font-semibold text-ink-muted"
        >
          ← Back
        </button>

        <div className="flex flex-col items-center gap-3">
          <Avatar initials={selectedUser.initials} color={selectedUser.color} size={64} />
          <div className="text-xl font-extrabold text-ink">{selectedUser.name}</div>
        </div>

        {selectedUser.hasPin ? (
          <>
            <PinPad
              error={login.isError ? "Wrong PIN — try again" : undefined}
              onSubmit={(pin) =>
                login.mutate({ userId: selectedUser.id, pin, remember: rememberMe })
              }
            />

            <label className="flex cursor-pointer items-center gap-2.5">
              <div
                onClick={() => setRememberMe((v) => !v)}
                className={`relative h-6 w-10 rounded-full transition-colors ${rememberMe ? "bg-ink" : "bg-chip"}`}
              >
                <div
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${rememberMe ? "translate-x-5" : "translate-x-1"}`}
                />
              </div>
              <span className="text-sm font-semibold text-ink-muted">Remember sign-in</span>
            </label>
          </>
        ) : (
          <div className="rounded-xl bg-chip px-5 py-4 text-center text-sm font-semibold text-ink-muted">
            No PIN set. Ask a parent to set one in Settings → People & roles.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-app px-6">
      <div className="text-center">
        <div className="text-2xl font-extrabold text-ink">{household.name}</div>
        <div className="mt-1 text-sm font-medium text-ink-muted">Who's signing in?</div>
      </div>
      <div className="flex flex-wrap justify-center gap-5">
        {household.users.map((user) => (
          <button
            key={user.id}
            onClick={() => { setSelectedUser(user); login.reset(); }}
            className="flex flex-col items-center gap-2"
          >
            <div className={!user.hasPin ? "opacity-40" : ""}>
              <Avatar initials={user.initials} color={user.color} size={56} />
            </div>
            <span className={`text-xs font-bold ${user.hasPin ? "text-ink" : "text-ink-faint"}`}>
              {user.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Centered({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-6 text-center text-sm font-medium text-ink-muted">
      {text}
    </div>
  );
}
