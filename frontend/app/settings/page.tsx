"use client";

import { FormEvent, useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { api, type User } from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [aiStatus, setAIStatus] = useState<{ enabled: boolean; provider: string; model: string } | null>(null);
  const [retention, setRetention] = useState(0.9);
  const [minutes, setMinutes] = useState(120);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [u, s] = await Promise.all([api.getUser(), api.getAIStatus()]);
        setUser(u);
        setRetention(u.target_retention);
        setMinutes(u.daily_study_minutes);
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
        daily_study_minutes: minutes,
      });
      setUser(updated);
      setMessage("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="empty">Loading settings…</div>;

  return (
    <>
      <header className="roadmap-strip">
        <div className="roadmap-strip-left">
          <h1 className="roadmap-title">Settings</h1>
          <span className="roadmap-summary">
            {user?.email ?? "—"} · {Math.round(retention * 100)}% retention · {minutes}m/day
          </span>
        </div>
      </header>

      <div className="stats-row">
        <StatCard label="Account" value={user?.email.split("@")[0] ?? "—"} hint={user?.email} />
        <StatCard label="Retention" value={`${Math.round(retention * 100)}%`} hint="FSRS target" />
        <StatCard label="Daily" value={`${minutes}m`} hint="study budget" />
        <StatCard
          label="Coach"
          value={aiStatus?.enabled ? "live" : "off"}
          hint={aiStatus?.enabled ? aiStatus.model.split("-").slice(0, 3).join("-") : "no API key"}
        />
      </div>

      <div className="panel">
        <h2>Scheduler</h2>
        <form className="form-grid" onSubmit={handleSave}>
          <label>
            Target retention <span style={{ color: "var(--amber)" }}>· {Math.round(retention * 100)}%</span>
            <input
              type="range"
              min={0.7}
              max={0.99}
              step={0.01}
              value={retention}
              onChange={(e) => setRetention(Number(e.target.value))}
            />
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "none", letterSpacing: 0, fontFamily: "var(--body)" }}>
              Higher = more frequent reviews, stronger memory. Default 90%.
            </span>
          </label>
          <label>
            Daily study budget (minutes)
            <input type="number" min={15} max={720} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "none", letterSpacing: 0, fontFamily: "var(--body)" }}>
              Cards above 80% priority auto-postpone when this is exceeded.
            </span>
          </label>
          {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
          {message && <p style={{ color: "var(--success)", margin: 0 }}>{message}</p>}
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>How scheduling works</h2>
        <ul style={{ color: "var(--text-soft)", fontSize: "0.92rem", lineHeight: 1.75, paddingLeft: "1.25rem", margin: 0 }}>
          <li><strong style={{ color: "var(--amber)", fontFamily: "var(--display)", fontStyle: "italic" }}>FSRS-6</strong> models memory decay and schedules reviews before you forget.</li>
          <li><strong style={{ color: "var(--amber)", fontFamily: "var(--display)", fontStyle: "italic" }}>Priority queue</strong> protects critical cards (0–10%) from auto-postpone.</li>
          <li><strong style={{ color: "var(--amber)", fontFamily: "var(--display)", fontStyle: "italic" }}>HEFT planner</strong> orders tasks across morning/afternoon focus windows.</li>
          <li><strong style={{ color: "var(--amber)", fontFamily: "var(--display)", fontStyle: "italic" }}>Per-track weights</strong> let domain-specific memory profiles emerge over time.</li>
        </ul>
      </div>

      <div className="panel">
        <h2>Coach (AI Advisor)</h2>
        {aiStatus?.enabled ? (
          <p style={{ margin: 0, color: "var(--text-soft)" }}>
            Connected to <code style={{ background: "var(--ink-2)", padding: "0.1rem 0.4rem", borderRadius: "3px", fontFamily: "var(--mono)" }}>{aiStatus.model}</code>.
            Coach can read your stats, recent reviews, struggling cards, and per-track breakdowns.
          </p>
        ) : (
          <>
            <p style={{ marginTop: 0, color: "var(--text-soft)" }}>
              Coach is offline. Add an API key to enable AI advice.
            </p>
            <pre style={{
              fontFamily: "var(--mono)", fontSize: "0.78rem", background: "var(--ink-2)",
              padding: "0.85rem 1rem", borderRadius: "var(--radius)", margin: 0, color: "var(--text-soft)",
            }}>{`# backend/.env\nANTHROPIC_API_KEY=sk-ant-...\n# or:\n# OPENAI_API_KEY=sk-...\n# AI_PROVIDER=openai\n# AI_MODEL=gpt-4o`}</pre>
          </>
        )}
      </div>
    </>
  );
}
