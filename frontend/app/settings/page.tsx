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
  const [learningFocus, setLearningFocus] = useState("");
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
        setLearningFocus(u.milestone_title ?? "");
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
        milestone_title: learningFocus || null,
        milestone_date: null,
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
  const pausedCount = pausedTracks.length;

  return (
    <div className="settings-page">
      <header className="settings-hero">
        <div>
          <p className="page-kicker">Preferences</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">
            Tune the learning engine without turning the room into a cockpit.
          </p>
        </div>
        <div className="settings-account">
          <span>{user?.email}</span>
          <button
            type="button"
            className="v2-btn ghost"
            onClick={() => {
              clearAuthToken();
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="settings-snapshot" aria-label="Current settings">
        <div>
          <strong>{Math.round(retention * 100)}%</strong>
          <span>target retention</span>
        </div>
        <div>
          <strong>{blockMinutes}m</strong>
          <span>study block</span>
        </div>
        <div>
          <strong>{activeCount}</strong>
          <span>active tracks</span>
        </div>
      </section>

      <form onSubmit={handleSave} className="settings-grid">
        <section className="settings-card settings-card-main">
          <div className="settings-card-head">
            <div>
              <h2>Learning rhythm</h2>
              <p>Retention, block length, and focus in one place.</p>
            </div>
            <button type="submit" className="v2-btn primary" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>

          <div className="settings-controls">
            <label className="settings-control">
              <span>
                <span>Target retention</span>
                <strong>{Math.round(retention * 100)}%</strong>
              </span>
              <input
                type="range"
                min={0.7}
                max={0.99}
                step={0.01}
                value={retention}
                onChange={(e) => setRetention(Number(e.target.value))}
              />
            </label>

            <label className="settings-control">
              <span>
                <span>Block size</span>
                <strong>{blockMinutes} min</strong>
              </span>
              <input
                type="number"
                min={30}
                max={240}
                step={5}
                value={blockMinutes}
                onChange={(e) => setBlockMinutes(Number(e.target.value))}
              />
            </label>

            <label className="settings-control wide">
              <span>
                <span>Current focus</span>
                <strong>optional</strong>
              </span>
              <input
                className="v2-input"
                placeholder="Graph algorithms, transformers, distributed caches..."
                value={learningFocus}
                onChange={(e) => setLearningFocus(e.target.value)}
              />
            </label>
          </div>

          <div className="settings-save-row">
            {message && <span className="field-msg-ok">{message}</span>}
            {error && <span className="field-msg-bad">{error}</span>}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <div>
              <h2>Track availability</h2>
              <p>{pausedCount} paused. Paused tracks stay out of Today but remain reviewable.</p>
            </div>
          </div>
          {activeCount === 0 && (
            <p className="settings-warning">All tracks are paused, so today&apos;s block stack will be empty.</p>
          )}
          <div className="settings-track-grid">
            {tracks.map((t) => {
              const paused = pausedTracks.includes(t.slug);
              const accent = trackAccent(t.slug, t.color);
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => toggleTrack(t.slug)}
                  className={`settings-track-toggle${paused ? " paused" : " active"}`}
                  style={{ ["--toggle-accent" as string]: accent }}
                >
                  <span className="settings-track-dot" aria-hidden />
                  <span className="settings-track-name">{t.name}</span>
                  <span className="settings-track-state">{paused ? "Paused" : "Active"}</span>
                </button>
              );
            })}
          </div>
        </section>
      </form>

      <section className="settings-card settings-status">
        <div>
          <span className="settings-status-label">Coach</span>
          {aiStatus?.enabled ? (
            <p>
              Connected to <code>{aiStatus.model}</code>
            </p>
          ) : (
            <p>Offline until an AI key is configured.</p>
          )}
        </div>
        {!aiStatus?.enabled && (
          <pre className="env-snippet">{`# backend/.env
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=AIza...`}</pre>
        )}
      </section>
    </div>
  );
}
