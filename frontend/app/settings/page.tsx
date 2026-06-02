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
  const [dailyNewCards, setDailyNewCards] = useState(0);
  const [pausedTracks, setPausedTracks] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
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
        setDailyNewCards(u.daily_new_cards ?? 0);
        setPausedTracks(u.paused_tracks ?? []);
        setDisplayName(u.display_name ?? "");
        setLearningGoals(u.learning_goals ?? "");
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
        daily_new_cards: dailyNewCards,
        paused_tracks: pausedTracks,
        display_name: displayName.trim() || null,
        learning_goals: learningGoals.trim() || null,
        milestone_title: milestoneTitle.trim() || null,
        milestone_date: milestoneDate ? new Date(`${milestoneDate}T00:00:00`).toISOString() : null,
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

  if (loading) return <p style={{ color: "var(--fg-mute)" }}>Loading settings…</p>;

  const activeCount = tracks.length - pausedTracks.length;
  const pausedCount = pausedTracks.length;
  const profileFields = [
    displayName.trim(),
    learningGoals.trim(),
    milestoneTitle.trim(),
    milestoneDate,
  ];
  const profileComplete = Math.round(
    (profileFields.filter(Boolean).length / profileFields.length) * 100
  );
  const initials = (displayName || user?.email || "U")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

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
          <span>{displayName || user?.email}</span>
          <button type="submit" form="settings-form" className="v2-btn primary" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
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
          <strong>{profileComplete}%</strong>
          <span>profile complete</span>
        </div>
      </section>

      <form id="settings-form" onSubmit={handleSave} className="settings-grid">
        <section className="settings-card settings-profile-card">
          <div className="settings-profile-head">
            <div className="settings-profile-avatar" aria-hidden>
              {initials || "U"}
            </div>
            <div>
              <h2>Your profile</h2>
              <p>
                This is what Coach and generated roadmaps use to understand what you are trying to become.
              </p>
            </div>
            <span className="settings-profile-complete">{profileComplete}% complete</span>
          </div>

          <div className="settings-controls profile-controls">
            <label className="settings-control">
              <span>
                <span>Name</span>
                <strong>public</strong>
              </span>
              <input
                className="v2-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </label>

            <label className="settings-control">
              <span>
                <span>Email</span>
                <strong>account</strong>
              </span>
              <input className="v2-input" value={user?.email ?? ""} readOnly />
            </label>

            <label className="settings-control wide">
              <span>
                <span>Learning goals</span>
                <strong>{learningGoals.length}/2000</strong>
              </span>
              <textarea
                className="v2-input"
                rows={4}
                maxLength={2000}
                value={learningGoals}
                onChange={(e) => setLearningGoals(e.target.value)}
                placeholder="I want to master backend systems, distributed architecture, and interview-ready problem solving."
              />
            </label>

            <label className="settings-control">
              <span>
                <span>Current milestone</span>
                <strong>optional</strong>
              </span>
              <input
                className="v2-input"
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="System design interviews"
              />
            </label>

            <label className="settings-control">
              <span>
                <span>Target date</span>
                <strong>optional</strong>
              </span>
              <input
                className="v2-input"
                type="date"
                value={milestoneDate}
                onChange={(e) => setMilestoneDate(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="settings-card settings-card-main">
          <div className="settings-card-head">
            <div>
              <h2>Learning rhythm</h2>
              <p>Retention, block length, and new-card pace in one place.</p>
            </div>
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
                <span>New-card cap</span>
                <strong>{dailyNewCards === 0 ? "unlimited" : `${dailyNewCards}/day`}</strong>
              </span>
              <input
                type="number"
                min={0}
                max={200}
                step={1}
                value={dailyNewCards}
                onChange={(e) => setDailyNewCards(Number(e.target.value))}
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
