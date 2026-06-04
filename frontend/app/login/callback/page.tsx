"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthToken } from "@/lib/auth";

/* ─── OAuth callback handler ──────────────────────────────── */

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const next = searchParams.get("next") || "/";
    const error = searchParams.get("error");

    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (token) {
      setAuthToken(token);
      router.replace(next.startsWith("/") ? next : "/");
      return;
    }

    router.replace("/login");
  }, [searchParams, router]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--canvas)",
      }}
    >
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--hairline)",
          borderRadius: 8,
          padding: "32px 40px",
          textAlign: "center",
          minWidth: 280,
        }}
      >
        {/* Spinner */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          style={{
            animation: "spin 0.8s linear infinite",
            color: "var(--accent)",
            margin: "0 auto 12px",
            display: "block",
          }}
        >
          <circle
            cx="10"
            cy="10"
            r="8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="22 18"
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </svg>
        <p
          style={{
            fontSize: 14,
            color: "var(--muted)",
          }}
        >
          Signing you in…
        </p>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function LoginCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackHandler />
    </Suspense>
  );
}
