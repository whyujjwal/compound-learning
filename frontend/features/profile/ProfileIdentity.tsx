"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Skeleton } from "@/components/primitives";
import { clearAuthToken } from "@/lib/auth";
import type { User } from "@/lib/api/types";

/* ─── Avatar ────────────────────────────────────────────────── */
function Avatar({ name, email }: { name: string; email: string }) {
  const initials = (name || email || "U")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      aria-hidden
      style={{
        width: 48,
        height: 48,
        borderRadius: 8,
        background: "var(--accent-soft)",
        border: "1px solid var(--hairline)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontWeight: 600,
        color: "var(--accent)",
        flexShrink: 0,
        letterSpacing: "-0.02em",
      }}
    >
      {initials || "U"}
    </div>
  );
}

/* ─── Props ─────────────────────────────────────────────────── */
interface ProfileIdentityProps {
  user: User | null;
  loading: boolean;
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  saving: boolean;
}

/* ─── Component ─────────────────────────────────────────────── */
export function ProfileIdentity({
  user,
  loading,
  displayName,
  onDisplayNameChange,
  saving,
}: ProfileIdentityProps) {
  const router = useRouter();
  const [hovering, setHovering] = useState(false);

  function handleSignOut() {
    clearAuthToken();
    router.replace("/login");
  }

  /* Section header */
  const sectionHead = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {loading ? (
          <Skeleton width={48} height={48} borderRadius={8} />
        ) : (
          <Avatar name={displayName} email={user?.email ?? ""} />
        )}
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
            {loading ? <Skeleton width={120} height={16} /> : (displayName || user?.email || "—")}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
            {loading ? <Skeleton width={180} height={13} style={{ marginTop: 4 }} /> : user?.email}
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={handleSignOut}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          color: hovering ? "var(--bad)" : "var(--muted)",
          borderColor: hovering ? "var(--bad)" : "transparent",
          transition: "color 150ms, border-color 150ms",
        }}
      >
        Sign out
      </Button>
    </div>
  );

  return (
    <div>
      {sectionHead}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Display name" htmlFor="display-name" hint="Shown in roadmaps and coach responses">
          {loading ? (
            <Skeleton height={34} />
          ) : (
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder="Your name"
              disabled={saving}
            />
          )}
        </Field>

        <Field label="Email" htmlFor="email-readonly">
          {loading ? (
            <Skeleton height={34} />
          ) : (
            <Input
              id="email-readonly"
              value={user?.email ?? ""}
              readOnly
              style={{ color: "var(--muted)", cursor: "default" }}
            />
          )}
        </Field>
      </div>
    </div>
  );
}
