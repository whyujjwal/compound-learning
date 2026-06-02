"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthToken } from "@/lib/auth";
import { api } from "@/lib/api";

type Mode = "signin" | "register";
type GoogleStatus = "loading" | "enabled" | "disabled" | "unknown";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const urlError = searchParams.get("error");

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(urlError);
  const [loading, setLoading] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>("loading");

  useEffect(() => {
    api
      .getGoogleAuthStatus()
      .then((s) => setGoogleStatus(s.enabled ? "enabled" : "disabled"))
      .catch(() => setGoogleStatus("unknown"));
  }, []);

  function startGoogleLogin() {
    if (googleStatus === "disabled") {
      setError("Google sign-in is not configured on this server.");
      return;
    }
    const params = new URLSearchParams({ next });
    window.location.href = `/api/auth/google?${params.toString()}`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data =
        mode === "register"
          ? await api.register(email.trim(), password, displayName.trim() || undefined)
          : await api.loginWithEmail(email.trim(), password);

      if (data.token) setAuthToken(data.token);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isRegister = mode === "register";
  const showGoogle = !isRegister;
  const googleDisabled = googleStatus === "disabled" || googleStatus === "loading";

  return (
    <>
      <div className="login-mode-tabs" role="tablist" aria-label="Sign in or register">
        <button
          type="button"
          role="tab"
          aria-selected={!isRegister}
          className={`login-mode-tab${!isRegister ? " active" : ""}`}
          onClick={() => {
            setMode("signin");
            setError(null);
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isRegister}
          className={`login-mode-tab${isRegister ? " active" : ""}`}
          onClick={() => {
            setMode("register");
            setError(null);
          }}
        >
          Create account
        </button>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        {showGoogle && (
          <>
            <button
              type="button"
              className="login-google-btn"
              onClick={startGoogleLogin}
              disabled={googleDisabled}
              aria-busy={googleStatus === "loading"}
            >
              {googleStatus === "loading" ? (
                <span className="login-google-loading" aria-hidden />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>
            {googleStatus === "unknown" && (
              <p className="login-hint">Google sign-in may still work — try the button above.</p>
            )}
            <p className="login-divider">
              <span>or</span>
            </p>
          </>
        )}

        {isRegister && (
          <>
            <label className="login-label" htmlFor="displayName">
              Name
            </label>
            <input
              id="displayName"
              type="text"
              className="login-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              placeholder="Your name"
            />
          </>
        )}

        <label className="login-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          required={isRegister}
        />

        <label className="login-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={isRegister ? 8 : undefined}
          required
        />

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="v2-btn login-submit" disabled={loading}>
          {loading
            ? isRegister
              ? "Creating account…"
              : "Signing in…"
            : isRegister
              ? "Create account"
              : "Sign in"}
        </button>

        {!isRegister && (
          <p className="login-footnote">
            Leave email blank to use the shared workspace password instead.
          </p>
        )}
      </form>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function LampMark() {
  return (
    <svg className="login-lamp" width="32" height="32" viewBox="0 0 32 32" aria-hidden>
      <defs>
        <radialGradient id="lamp-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#e6b787" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#c89b6b" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      <ellipse cx="16" cy="14" rx="10" ry="9" fill="url(#lamp-glow)" opacity="0.55" />
      <path
        d="M16 4c-4.4 0-8 3.1-8 7.5 0 2.8 1.4 5.2 3.5 6.7V20h9v-1.8c2.1-1.5 3.5-3.9 3.5-6.7C24 7.1 20.4 4 16 4z"
        fill="none"
        stroke="#c89b6b"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M12 22h8v1.5a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V22z" fill="#c89b6b" opacity="0.85" />
      <line x1="16" y1="25.5" x2="16" y2="28" stroke="#c89b6b" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <LampMark />
          <p className="login-eyebrow">Compound</p>
        </div>
        <h1 className="login-title">Welcome back</h1>
        <p className="login-sub">Your personal learning workspace — lit for deep study.</p>
        <Suspense fallback={<p className="login-sub">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
