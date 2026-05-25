"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useShell } from "@/components/ui/Shell";
import { trackAccent } from "@/lib/trackColors";
import { clearAuthToken } from "@/lib/auth";
import { api, type Track, type User } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const { setRightPanel } = useShell();
  useEffect(() => {
    setRightPanel(null);
    return () => setRightPanel(null);
  }, [setRightPanel]);

  const [user, setUser] = useState<User | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [aiStatus, setAIStatus] = useState<{ enabled: boolean; provider: string; model: string } | null>(null);
  const [retention, setRetention] = useState(0.9);
  const [blockMinutes, setBlockMinutes] = useState(120);
  const [pausedTracks, setPausedTracks] = useState<string[]>([]);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [u, t, s] = await Promise.all([
          api.getUser(),
          api.getTracks(),
          api.getAIStatus(),
        ]);
        setUser(u);
        setTracks(t);
        setRetention(u.target_retention);
        setBlockMinutes(u.daily_study_minutes);
        setPausedTracks(u.paused_tracks ?? []);
        setMilestoneTitle(u.milestone_title ?? "");
        setMilestoneDate(u.milestone_date ? u.milestone_date.slice(0, 10) : "");
        setAIStatus(s);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await api.updateUser({
        target_retention: retention,
        daily_study_minutes: blockMinutes,
        paused_tracks: pausedTracks,
        milestone_title: milestoneTitle || null,
        milestone_date: milestoneDate ? new Date(milestoneDate).toISOString() : null,
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

  if (loading) return <p style={{ color: "var(--fg-mute)" }}>Loading settings…</p>;

  const activeCount = tracks.length - pausedTracks.length;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">
            {user?.email} · {Math.round(retention * 100)}% retention · {blockMinutes}m / block
          </p>
        </div>
      </header>

      <form onSubmit={handleSave}>
        <section className="settings-panel">
          <h2>Session</h2>
          <div className="field">
            <span className="field-label">
              Target retention <span className="field-value">{Math.round(retention * 100)}%</span>
            </span>
            <input
              type="range"
              min={0.7}
              max={0.99}
              step={0.01}
              value={retention}
              onChange={(e) => setRetention(Number(e.target.value))}
            />
            <span className="field-hint">
              FSRS aims to schedule reviews so you recall this fraction of cards. Default 90%.
            </span>
          </div>

          <div className="field">
            <span className="field-label">Block size · {blockMinutes} minutes</span>
            <input
              type="number"
              min={30}
              max={240}
              step={5}
              value={blockMinutes}
              onChange={(e) => setBlockMinutes(Number(e.target.value))}
            />
            <span className="field-hint">
              How long a single block lasts. New items pack up to this budget; FSRS reviews always run.
            </span>
          </div>
        </section>

        <section className="settings-panel">
          <h2>Milestone / exam mode</h2>
          <p className="field-hint" style={{ marginBottom: 12 }}>
            Set a target date (e.g. interview) to boost consolidation reviews as the date approaches.
          </p>
          <div className="field">
            <span className="field-label">Milestone title</span>
            <input
              className="v2-input"
              placeholder="Google interview"
              value={milestoneTitle}
              onChange={(e) => setMilestoneTitle(e.target.value)}
            />
          </div>
          <div className="field">
            <span className="field-label">Target date</span>
            <input
              type="date"
              className="v2-input"
              value={milestoneDate}
              onChange={(e) => setMilestoneDate(e.target.value)}
            />
          </div>
        </section>

        <section className="settings-panel">
          <h2>Active tracks</h2>
          <div className="field">
            <span className="field-hint">
              Paused tracks are skipped in today&apos;s blocks. Reviews still appear if you open a track manually.
              {activeCount === 0 && (
                <strong style={{ color: "var(--warn)", display: "block", marginTop: 6 }}>
                  All tracks paused — your block stack will be empty.
                </strong>
              )}
            </span>
          </div>
          <div className="toggle-grid">
            {tracks.map((t) => {
              const paused = pausedTracks.includes(t.slug);
              const accent = trackAccent(t.slug, t.color);
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => toggleTrack(t.slug)}
                  className={`toggle-card${paused ? " paused" : " active"}`}
                  style={{ ["--toggle-accent" as string]: accent }}
                >
                  <span className="toggle-card-state">{paused ? "Paused" : "Active"}</span>
                  <span className="toggle-card-name">{t.name}</span>
                  <span className="toggle-card-meta">{t.material_count} materials</span>
                </button>
              );
            })}
          </div>
        </section>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" className="v2-btn primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          {message && <span className="field-msg-ok">{message}</span>}
          {error && <span className="field-msg-bad">{error}</span>}
        </div>
      </form>

      <section className="settings-panel" style={{ marginTop: 24 }}>
        <h2>How sessions work</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--fg-soft)", fontSize: 13, lineHeight: 1.7 }}>
          <li><strong style={{ color: "var(--fg)" }}>FSRS-6</strong> schedules each rep just before you forget.</li>
          <li><strong style={{ color: "var(--fg)" }}>Two blocks weekdays, four weekends</strong> — one track per block.</li>
          <li><strong style={{ color: "var(--fg)" }}>Next-in-sequence</strong> — picks up wherever you left off.</li>
          <li><strong style={{ color: "var(--fg)" }}>No streak penalty.</strong> Miss a week and tomorrow looks the same.</li>
        </ul>
      </section>

      <section className="settings-panel">
        <h2>Coach</h2>
        {aiStatus?.enabled ? (
          <p style={{ color: "var(--fg-soft)", fontSize: 13, margin: 0, lineHeight: 1.55 }}>
            Connected to{" "}
            <code style={{ fontFamily: "var(--font-mono-stack)", color: "var(--accent)" }}>
              {aiStatus.model}
            </code>
            . Coach reads progress, retention, struggling cards, and per-track breakdowns to surface
            daily nudges and weekly reviews.
          </p>
        ) : (
          <>
            <p style={{ color: "var(--fg-mute)", fontSize: 13, margin: "0 0 12px" }}>
              Coach is offline. Add an API key to enable AI advice.
            </p>
            <pre className="env-snippet">{`# backend/.env
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=AIza...`}</pre>
          </>
        )}
      </section>

      <section className="settings-panel">
        <h2>Access</h2>
        <p style={{ color: "var(--fg-soft)", fontSize: 13, margin: "0 0 12px", lineHeight: 1.55 }}>
          Sign out to clear this browser&apos;s session and return to the password screen.
        </p>
        <button
          type="button"
          className="v2-btn"
          onClick={() => {
            clearAuthToken();
            router.replace("/login");
          }}
        >
          Sign out
        </button>
      </section>
    </>
  );
}
