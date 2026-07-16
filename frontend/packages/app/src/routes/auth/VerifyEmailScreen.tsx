import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useVerifyEmail } from "@chaos-coordinator/core";

export function VerifyEmailScreen() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const verifyEmail = useVerifyEmail();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || !token) return;
    attempted.current = true;
    verifyEmail.mutate({ token });
  }, [token, verifyEmail]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-app px-6 text-center">
      {!token ? (
        <div className="text-sm font-medium text-ink-muted">This verification link is missing its token.</div>
      ) : verifyEmail.isPending || verifyEmail.isIdle ? (
        <div className="text-sm font-medium text-ink-muted">Verifying your email…</div>
      ) : verifyEmail.isError ? (
        <>
          <div className="text-xl font-extrabold text-ink">That link didn't work</div>
          <div className="max-w-[300px] text-sm font-medium text-ink-muted">
            It may have expired. Try signing in — you can request a fresh link from there.
          </div>
        </>
      ) : (
        <>
          <div className="text-xl font-extrabold text-ink">Email verified!</div>
          <div className="max-w-[300px] text-sm font-medium text-ink-muted">You're all set — you can sign in now.</div>
        </>
      )}
      <Link to="/" className="rounded-2xl bg-ink px-6 py-3 text-sm font-bold text-white">
        Sign In
      </Link>
    </div>
  );
}
