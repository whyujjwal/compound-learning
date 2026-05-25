"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body = email.trim()
        ? { email: email.trim(), password }
        : { password };

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.detail)
            ? data.detail[0]?.msg ?? "Login failed"
            : "Invalid credentials"
        );
      }

      const data = (await res.json()) as { auth_required: boolean; token: string | null };
      if (data.token) {
        setAuthToken(data.token);
      }
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
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
        autoComplete="current-password"
        required
      />

      {error && <p className="login-error">{error}</p>}
      <button type="submit" className="v2-btn login-submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="login-sub" style={{ marginTop: 12, fontSize: 12 }}>
        Leave email blank to use the shared workspace password instead.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-card">
        <p className="login-eyebrow">Compound</p>
        <h1 className="login-title">Sign in</h1>
        <p className="login-sub">Your personal learning workspace.</p>
        <Suspense fallback={<p className="login-sub">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
