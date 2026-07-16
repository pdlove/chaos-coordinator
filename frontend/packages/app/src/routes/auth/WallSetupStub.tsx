import { Link } from "react-router-dom";

/** Placeholder for the QR-code device pairing flow (plan_001.md Workstream 3) — not built yet. */
export function WallSetupStub() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app px-6 text-center">
      <div className="text-xl font-extrabold text-ink">Wall display setup</div>
      <div className="max-w-[280px] text-sm font-medium text-ink-muted">
        QR-code pairing for wall-mounted displays is coming soon.
      </div>
      <Link to="/" className="text-sm font-bold text-ink underline underline-offset-2">
        Back to sign in
      </Link>
    </div>
  );
}
