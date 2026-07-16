import { useState } from "react";
import { Link } from "react-router-dom";
import { usePasswordLogin } from "@chaos-coordinator/core";
import { Turnstile } from "../../components/Turnstile";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const login = usePasswordLogin();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate({ email, password, remember: rememberMe, turnstileToken });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-7 bg-app px-6">
      <div className="flex flex-col items-center text-center">
        <img src="/branding/logo.png" alt="Chaos Coordinator" className="mb-2 h-20 w-20" />
        <div className="text-2xl font-extrabold text-ink">Chaos Coordinator</div>
        <div className="mt-1 text-sm font-medium text-ink-muted">Sign in to your family account</div>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-[340px] flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

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

        <Turnstile onVerify={setTurnstileToken} />

        {login.isError && (
          <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">
            Couldn't sign in — check your email and password.
          </div>
        )}

        <button
          type="submit"
          disabled={login.isPending || !email || !password || turnstileToken === null}
          className="rounded-2xl bg-ink py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          Sign In
        </button>
      </form>

      <div className="flex flex-col items-center gap-2 text-sm font-semibold">
        <Link to="/register" className="text-ink underline underline-offset-2">
          Family Registration
        </Link>
        <Link to="/wall-setup" className="text-ink-muted">
          Set up as Wall Display
        </Link>
      </div>
    </div>
  );
}
