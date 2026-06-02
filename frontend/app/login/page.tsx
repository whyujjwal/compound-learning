"use client";

import { Suspense, FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { setAuthToken } from "@/lib/auth";
import { api } from "@/lib/api";

type Mode = "signin" | "register";

function friendlyError(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("access_denied") || lower.includes("cancelled")) {
    return "Sign-in was cancelled.";
  }
  if (lower.includes("redirect_uri_mismatch")) {
    return "Google sign-in is misconfigured. Try again later.";
  }
  if (lower.includes("expired") || lower.includes("state")) {
    return "Session expired. Please try again.";
  }
  if (raw.length > 100) return "Sign-in failed. Please try again.";
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    friendlyError(searchParams.get("error")),
  );
  const [loading, setLoading] = useState(false);

  function startGoogleLogin() {
    setError(null);
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

  return (
    <>
      <form className="login-form" onSubmit={handleSubmit}>
        <button type="button" className="login-google-btn" onClick={startGoogleLogin}>
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="login-divider">
          <span>or</span>
        </p>

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
          required
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
              : "Sign in with email"}
        </button>
      </form>

      <p className="login-switch">
        {isRegister ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          className="login-link-btn"
          onClick={() => {
            setMode(isRegister ? "signin" : "register");
            setError(null);
          }}
        >
          {isRegister ? "Sign in" : "Create account"}
        </button>
      </p>
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

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <div className="login-card">
        <div className="login-brand">
          <span className="appbar-brand-mark" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          <p className="login-eyebrow">compound</p>
        </div>
        <h1 className="login-title">Sign in</h1>
        <p className="login-sub">Turn small study blocks into layered, compounding mastery.</p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
