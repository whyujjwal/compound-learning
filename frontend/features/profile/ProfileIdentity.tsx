"use client";

import { type User } from "@/lib/api";
import { clearAuthToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface Props {
  user: User | null;
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  saving: boolean;
}

export function ProfileIdentity({ user, displayName, onDisplayNameChange, saving }: Props) {
  const router = useRouter();

  const initials = (displayName || user?.email || "U")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  function handleSignOut() {
    clearAuthToken();
    router.replace("/login");
  }

  return (
    <section className="settings-card settings-profile-card">
      <div className="settings-profile-head">
        <div className="settings-profile-avatar" aria-hidden>
          {initials || "U"}
        </div>
        <div>
          <h2>Identity</h2>
          <p>Your name is shown in roadmaps and Coach responses.</p>
        </div>
        <button
          type="button"
          className="v2-btn ghost"
          onClick={handleSignOut}
          style={{ marginLeft: "auto" }}
        >
          Sign out
        </button>
      </div>

      <div className="settings-controls profile-controls">
        <label className="settings-control">
          <span>
            <span>Display name</span>
            <strong>editable</strong>
          </span>
          <input
            className="v2-input"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder="Your name"
            disabled={saving}
          />
        </label>

        <label className="settings-control">
          <span>
            <span>Email</span>
            <strong>account</strong>
          </span>
          <input className="v2-input" value={user?.email ?? ""} readOnly />
        </label>
      </div>
    </section>
  );
}
