"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContent } from "@/components/shell";
import { Button, useToast } from "@/components/primitives";
import {
  useUser,
  useProfileStats,
  useRetentionTimeline,
  useUpdateUser,
} from "@/lib/hooks";
import { useActivity } from "@/lib/hooks/useToday";
import { useSyllabiList } from "@/lib/hooks/useSyllabi";
import { ProfileIdentity } from "@/features/profile/ProfileIdentity";
import { ProfileStats } from "@/features/profile/ProfileStats";
import { StudyPreferences } from "@/features/profile/StudyPreferences";

/* ─── Section header ─────────────────────────────────────────── */
function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: description ? 3 : 0,
        }}
      >
        {title}
      </h2>
      {description && (
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{description}</p>
      )}
    </div>
  );
}

/* ─── Section divider ────────────────────────────────────────── */
function SectionDivider() {
  return (
    <div
      aria-hidden
      style={{
        height: 1,
        background: "var(--hairline)",
        margin: "36px 0",
      }}
    />
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function ProfilePage() {
  const toast = useToast();

  /* ── Data queries ── */
  const { data: user, isLoading: userLoading } = useUser();
  const { data: stats, isLoading: statsLoading } = useProfileStats();
  const { data: activity = [], isLoading: activityLoading } = useActivity(112);
  const { data: retentionTimeline = [] } = useRetentionTimeline(30);
  const { data: syllabi = [] } = useSyllabiList();
  const updateUser = useUpdateUser();

  /* ── Local editable state (initialised from server data) ── */
  const [displayName, setDisplayName] = useState("");
  const [retention, setRetention] = useState(0.9);
  const [blockMinutes, setBlockMinutes] = useState(120);
  const [dailyNewCards, setDailyNewCards] = useState(0);
  const [pausedTracks, setPausedTracks] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  // Seed local state when user data arrives
  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_name ?? "");
    setRetention(user.target_retention);
    setBlockMinutes(user.daily_study_minutes);
    setDailyNewCards(user.daily_new_cards ?? 0);
    setPausedTracks(user.paused_tracks ?? []);
    setDirty(false);
  }, [user]);

  /* ── Track shapes for preferences section ── */
  const tracks = syllabi.map((s) => ({
    slug: s.slug,
    name: s.name,
    color: s.color ?? "#787774",
  }));

  /* ── Dirty flag helpers ── */
  const markDirty = useCallback(() => setDirty(true), []);

  function handleDisplayNameChange(v: string) {
    setDisplayName(v);
    markDirty();
  }
  function handleRetentionChange(v: number) {
    setRetention(v);
    markDirty();
  }
  function handleBlockMinutesChange(v: number) {
    setBlockMinutes(v);
    markDirty();
  }
  function handleDailyNewCardsChange(v: number) {
    setDailyNewCards(v);
    markDirty();
  }
  function handleToggleTrack(slug: string) {
    setPausedTracks((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
    markDirty();
  }

  /* ── Save ── */
  async function handleSave() {
    try {
      await updateUser.mutateAsync({
        display_name: displayName.trim() || null,
        target_retention: retention,
        daily_study_minutes: blockMinutes,
        daily_new_cards: dailyNewCards,
        paused_tracks: pausedTracks,
        onboarded: true,
      });
      setDirty(false);
      toast.push({ kind: "success", title: "Saved", body: "Your preferences have been updated." });
    } catch (err) {
      toast.push({
        kind: "error",
        title: "Failed to save",
        body: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }

  const saving = updateUser.isPending;
  const statsLoaded = !statsLoading && !activityLoading;
  const profileLoading = userLoading;

  return (
    <PageContent style={{ paddingTop: 40, paddingBottom: 80 }}>
      {/* ── Page title ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 36,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 6,
            }}
          >
            Account
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--text)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              marginBottom: 8,
            }}
          >
            Profile
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)" }}>
            Identity, progress, and study preferences in one place.
          </p>
        </div>

        {/* Save button — only visible when dirty */}
        {dirty && (
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            loading={saving}
            disabled={saving}
            style={{ flexShrink: 0, marginTop: 6 }}
          >
            Save changes
          </Button>
        )}
      </div>

      {/* ══════════════════════════════════════════
          Section 1 — Identity
         ══════════════════════════════════════════ */}
      <SectionHeader
        title="Identity"
        description="Your name is shown in roadmaps and coach responses."
      />
      <ProfileIdentity
        user={user ?? null}
        loading={profileLoading}
        displayName={displayName}
        onDisplayNameChange={handleDisplayNameChange}
        saving={saving}
      />

      <SectionDivider />

      {/* ══════════════════════════════════════════
          Section 2 — Progress & Stats
         ══════════════════════════════════════════ */}
      <SectionHeader
        title="Progress"
        description="Reviews, retention, and mastery over time."
      />
      <ProfileStats
        stats={stats ?? null}
        activity={activity}
        retentionTimeline={retentionTimeline}
        loading={!statsLoaded}
      />

      <SectionDivider />

      {/* ══════════════════════════════════════════
          Section 3 — Study preferences
         ══════════════════════════════════════════ */}
      <SectionHeader
        title="Study preferences"
        description="Daily budget, retention target, and track availability."
      />
      <StudyPreferences
        loading={profileLoading}
        retention={retention}
        blockMinutes={blockMinutes}
        dailyNewCards={dailyNewCards}
        pausedTracks={pausedTracks}
        tracks={tracks}
        onRetentionChange={handleRetentionChange}
        onBlockMinutesChange={handleBlockMinutesChange}
        onDailyNewCardsChange={handleDailyNewCardsChange}
        onToggleTrack={handleToggleTrack}
        saving={saving}
      />

      {/* Bottom save affordance */}
      {dirty && (
        <div
          style={{
            marginTop: 32,
            paddingTop: 20,
            borderTop: "1px solid var(--hairline)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => {
              // Reset to server state
              if (!user) return;
              setDisplayName(user.display_name ?? "");
              setRetention(user.target_retention);
              setBlockMinutes(user.daily_study_minutes);
              setDailyNewCards(user.daily_new_cards ?? 0);
              setPausedTracks(user.paused_tracks ?? []);
              setDirty(false);
            }}
            style={{
              background: "none",
              border: "none",
              fontSize: 14,
              color: "var(--muted)",
              cursor: "pointer",
              padding: "0 4px",
            }}
          >
            Discard changes
          </button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            loading={saving}
            disabled={saving}
          >
            Save changes
          </Button>
        </div>
      )}
    </PageContent>
  );
}
