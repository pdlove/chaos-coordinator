import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { disablePushNotifications, enablePushNotifications, getPushSubscription, isPushSupported } from "@chaos-coordinator/core";

export function NotificationsSettings() {
  const navigate = useNavigate();
  const supported = isPushSupported();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) {
      setLoading(false);
      return;
    }
    getPushSubscription()
      .then((sub) => setEnabled(sub !== null))
      .finally(() => setLoading(false));
  }, [supported]);

  async function toggle() {
    setError(null);
    setBusy(true);
    try {
      if (enabled) {
        await disablePushNotifications();
        setEnabled(false);
      } else {
        await enablePushNotifications();
        setEnabled(true);
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message === "permission_denied"
          ? "Notifications were blocked — allow them in your browser settings to enable this."
          : "Couldn't enable notifications. Try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none items-center gap-2.5 px-5 pb-1 pt-1.5">
        <button onClick={() => navigate("/more")} className="text-lg">
          ←
        </button>
        <span className="text-xl font-extrabold text-ink">Notifications</span>
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5 pt-2.5">
        {!supported ? (
          <div className="text-sm font-medium text-ink-muted">
            Your browser doesn't support push notifications. On iPhone, add this app to your Home Screen first (Share → Add
            to Home Screen), then try again from there.
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-card bg-card p-3.5 shadow-sm">
            <div className="pr-3">
              <div className="text-sm font-bold text-ink">Chore &amp; calendar alerts</div>
              <div className="mt-0.5 text-[11px] font-medium text-ink-faint">
                Get notified for chore alarms, calendar reminders, and when someone finishes a chore.
              </div>
            </div>
            <button
              disabled={loading || busy}
              onClick={toggle}
              aria-label="Toggle notifications"
              className={`relative h-6 w-10 flex-none rounded-full transition-colors disabled:opacity-50 ${enabled ? "bg-ink" : "bg-chip"}`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-1"}`}
              />
            </button>
          </div>
        )}
        {error && <div className="text-[11px] font-semibold text-cat-doctor">{error}</div>}
      </div>
    </div>
  );
}
