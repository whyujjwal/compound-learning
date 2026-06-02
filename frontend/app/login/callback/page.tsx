"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthToken } from "@/lib/auth";

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

  return <p className="login-sub">Signing you in…</p>;
}

export default function LoginCallbackPage() {
  return (
    <div className="login-page">
      <div className="login-card">
        <Suspense fallback={null}>
          <CallbackHandler />
        </Suspense>
      </div>
    </div>
  );
}
