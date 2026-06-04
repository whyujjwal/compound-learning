"use client";

import { Suspense, type FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Field } from "@/components/primitives";
import { useLoginWithEmail, useRegister, useGoogleAuthStatus } from "@/lib/hooks";

/* ─── Helpers ─────────────────────────────────────────────── */

type Mode = "signin" | "register";

function friendlyError(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("access_denied") || lower.includes("cancelled"))
    return "Sign-in was cancelled.";
  if (lower.includes("redirect_uri_mismatch"))
    return "Google sign-in is misconfigured. Try again later.";
  if (lower.includes("expired") || lower.includes("state"))
    return "Session expired. Please try again.";
  if (raw.length > 100) return "Sign-in failed. Please try again.";
  return raw;
}

/* ─── Google OAuth icon ───────────────────────────────────── */

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
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

/* ─── Wordmark ────────────────────────────────────────────── */

function Wordmark() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 28,
      }}
    >
      {/* Three-dot brand mark */}
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: "block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--accent)",
              opacity: 1 - i * 0.25,
            }}
          />
        ))}
      </span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: "var(--text)",
        }}
      >
        compound
      </span>
    </div>
  );
}

/* ─── Divider ─────────────────────────────────────────────── */

function Divider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBlock: 16,
      }}
    >
      <span
        style={{
          flex: 1,
          height: 1,
          background: "var(--hairline)",
        }}
      />
      <span
        style={{
          fontSize: 12,
          color: "var(--muted)",
          userSelect: "none",
        }}
      >
        {label}
      </span>
      <span
        style={{
          flex: 1,
          height: 1,
          background: "var(--hairline)",
        }}
      />
    </div>
  );
}

/* ─── Main form component ─────────────────────────────────── */

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(
    friendlyError(searchParams.get("error")),
  );

  const isRegister = mode === "register";

  const { data: googleStatus } = useGoogleAuthStatus();
  const googleEnabled = googleStatus?.enabled === true;

  const loginMutation = useLoginWithEmail();
  const registerMutation = useRegister();

  const isPending = loginMutation.isPending || registerMutation.isPending;

  function startGoogleLogin() {
    setFormError(null);
    const params = new URLSearchParams({ next });
    window.location.href = `/api/auth/google?${params.toString()}`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const onSuccess = () => router.replace(next);
    const onError = (err: Error) => setFormError(err.message || "Something went wrong");

    if (isRegister) {
      registerMutation.mutate(
        { email: email.trim(), password, displayName: displayName.trim() || undefined },
        { onSuccess, onError },
      );
    } else {
      loginMutation.mutate(
        { email: email.trim(), password },
        { onSuccess, onError },
      );
    }
  }

  function switchMode() {
    setMode(isRegister ? "signin" : "register");
    setFormError(null);
  }

  return (
    <div>
      {/* Google OAuth button */}
      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={startGoogleLogin}
            style={{
              width: "100%",
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text)",
              background: "var(--canvas)",
              border: "1px solid var(--hairline)",
              borderRadius: 4,
              cursor: "pointer",
              transition: "background var(--dur-fast)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--canvas)";
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <Divider label="or" />
        </>
      )}

      {/* Email / password form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {isRegister && (
          <Field label="Name" htmlFor="displayName">
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              placeholder="Your name"
            />
          </Field>
        )}

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={isRegister ? 8 : undefined}
            required
          />
        </Field>

        {/* Inline error */}
        {formError && (
          <p
            role="alert"
            style={{
              fontSize: 13,
              color: "var(--bad)",
              padding: "8px 10px",
              background: "color-mix(in srgb, var(--bad) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--bad) 20%, transparent)",
              borderRadius: 4,
            }}
          >
            {formError}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isPending}
          style={{ width: "100%", marginTop: 4 }}
        >
          {isPending
            ? isRegister
              ? "Creating account…"
              : "Signing in…"
            : isRegister
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      {/* Mode toggle */}
      <p
        style={{
          marginTop: 20,
          fontSize: 13,
          color: "var(--muted)",
          textAlign: "center",
        }}
      >
        {isRegister ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          onClick={switchMode}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--accent)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {isRegister ? "Sign in" : "Create account"}
        </button>
      </p>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--canvas)",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
        }}
      >
        {/* Card */}
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--hairline)",
            borderRadius: 8,
            padding: "32px 28px",
          }}
        >
          <Wordmark />

          {/* Heading */}
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "var(--text)",
                lineHeight: 1.3,
                marginBottom: 4,
              }}
            >
              Welcome back
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              Small study blocks, compounding mastery.
            </p>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
