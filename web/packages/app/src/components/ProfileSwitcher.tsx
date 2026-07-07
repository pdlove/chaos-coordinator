import { useHousehold, useSelectProfile } from "@chaos-coordinator/core";
import { Avatar } from "./Avatar";

/** The phone app's entry gate — picking a household member is a UI convenience (defaults for
 * ownership/assignment), not a login. Sensitive actions are separately PIN-gated. */
export function ProfileSwitcher() {
  const { data: household, isLoading, isError } = useHousehold();
  const selectProfile = useSelectProfile();

  if (isLoading) {
    return <CenteredMessage text="Loading household…" />;
  }

  if (isError || !household) {
    return <CenteredMessage text="Couldn't reach the Chaos Coordinator server. Is it running?" />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-app px-6">
      <div className="text-center">
        <div className="text-2xl font-extrabold text-ink">{household.name}</div>
        <div className="mt-1 text-sm font-medium text-ink-muted">Who's using this?</div>
      </div>
      <div className="flex flex-wrap justify-center gap-5">
        {household.users.map((user) => (
          <button
            key={user.id}
            onClick={() => selectProfile.mutate({ userId: user.id })}
            className="flex flex-col items-center gap-2"
          >
            <Avatar initials={user.initials} color={user.color} size={56} />
            <span className="text-xs font-bold text-ink">{user.name}</span>
          </button>
        ))}
      </div>
      {selectProfile.isError && (
        <div className="text-sm font-medium text-cat-doctor">Couldn't select that profile — try again.</div>
      )}
    </div>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-6 text-center text-sm font-medium text-ink-muted">
      {text}
    </div>
  );
}
