"use client";

import { FormEvent, useEffect, useState } from "react";
import { useShell } from "@/components/ui/Shell";
import { api, type User } from "@/lib/api";
import { ProfileIdentity } from "@/features/profile/ProfileIdentity";
import { ProfileStats } from "@/features/profile/ProfileStats";
import { StudyPreferences } from "@/features/profile/StudyPreferences";

export default function ProfilePage() {
  const { stats, activity, tracks, setRightPanel } = useShell();

  useEffect(() => {
    setRightPanel(null);
    return () => setRightPanel(null);
  }, [setRightPanel]);

  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [retention, setRetention] = useState(0.9);
  const [blockMinutes, setBlockMinutes] = useState(120);
  const [dailyNewCards, setDailyNewCards] = useState(0);
  const [pausedTracks, setPausedTracks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getUser()
      .then((u) => {
        setUser(u);
        setDisplayName(u.display_name ?? "");
        setRetention(u.target_retention);
        setBlockMinutes(u.daily_study_minutes);
        setDailyNewCards(u.daily_new_cards ?? 0);
        setPausedTracks(u.paused_tracks ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await api.updateUser({
        display_name: displayName.trim() || null,
        target_retention: retention,
        daily_study_minutes: blockMinutes,
        daily_new_cards: dailyNewCards,
        paused_tracks: pausedTracks,
        onboarded: true,
      });
      setUser(updated);
      setMessage("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const toggleTrack = (slug: string) =>
    setPausedTracks((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );

  if (loading) return <p style={{ color: "var(--fg-mute)" }}>Loading…</p>;

  return (
    <div className="settings-page">
      <header className="settings-hero">
        <div>
          <p className="page-kicker">Account</p>
          <h1 className="page-title">Profile</h1>
          <p className="page-sub">
            Identity, progress, and study preferences in one place.
          </p>
        </div>
        <div className="settings-account">
          <span>{displayName || user?.email}</span>
          <button
            type="submit"
            form="profile-form"
            className="v2-btn primary"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </header>

      <div className="settings-snapshot" aria-label="Current settings">
        <div>
          <strong>{Math.round(retention * 100)}%</strong>
          <span>target retention</span>
        </div>
        <div>
          <strong>{blockMinutes}m</strong>
          <span>study block</span>
        </div>
        <div>
          <strong>{stats?.current_streak ?? 0}d</strong>
          <span>streak</span>
        </div>
      </div>

      <form id="profile-form" onSubmit={handleSave} className="settings-grid">
        {/* Section 1: Identity */}
        <ProfileIdentity
          user={user}
          displayName={displayName}
          onDisplayNameChange={setDisplayName}
          saving={saving}
        />

        {/* Section 3: Study preferences (rendered inside the form) */}
        <StudyPreferences
          tracks={tracks}
          retention={retention}
          blockMinutes={blockMinutes}
          dailyNewCards={dailyNewCards}
          pausedTracks={pausedTracks}
          onRetentionChange={setRetention}
          onBlockMinutesChange={setBlockMinutes}
          onDailyNewCardsChange={setDailyNewCards}
          onToggleTrack={toggleTrack}
          saving={saving}
          message={message}
          error={error}
        />
      </form>

      {/* Section 2: Progress (outside form — display only) */}
      <ProfileStats stats={stats} activity={activity} />
    </div>
  );
}
