"use client";

import { type Track } from "@/lib/api";
import { trackAccent } from "@/lib/trackColors";

interface Props {
  tracks: Track[];
  retention: number;
  blockMinutes: number;
  dailyNewCards: number;
  pausedTracks: string[];
  onRetentionChange: (v: number) => void;
  onBlockMinutesChange: (v: number) => void;
  onDailyNewCardsChange: (v: number) => void;
  onToggleTrack: (slug: string) => void;
  saving: boolean;
  message: string | null;
  error: string | null;
}

export function StudyPreferences({
  tracks,
  retention,
  blockMinutes,
  dailyNewCards,
  pausedTracks,
  onRetentionChange,
  onBlockMinutesChange,
  onDailyNewCardsChange,
  onToggleTrack,
  saving,
  message,
  error,
}: Props) {
  const activeCount = tracks.length - pausedTracks.length;
  const pausedCount = pausedTracks.length;

  return (
    <>
      <section className="settings-card settings-card-main">
        <div className="settings-card-head">
          <div>
            <h2>Study preferences</h2>
            <p>Retention target, block length, and daily card pace.</p>
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
              onChange={(e) => onRetentionChange(Number(e.target.value))}
              disabled={saving}
            />
          </label>

          <label className="settings-control">
            <span>
              <span>Study block</span>
              <strong>{blockMinutes} min</strong>
            </span>
            <input
              type="number"
              min={30}
              max={240}
              step={5}
              value={blockMinutes}
              onChange={(e) => onBlockMinutesChange(Number(e.target.value))}
              disabled={saving}
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
              onChange={(e) => onDailyNewCardsChange(Number(e.target.value))}
              disabled={saving}
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
          <p className="settings-warning">
            All tracks are paused — today&apos;s block stack will be empty.
          </p>
        )}

        <div className="settings-track-grid">
          {tracks.map((t) => {
            const paused = pausedTracks.includes(t.slug);
            const accent = trackAccent(t.slug, t.color);
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => onToggleTrack(t.slug)}
                className={`settings-track-toggle${paused ? " paused" : " active"}`}
                style={{ ["--toggle-accent" as string]: accent }}
                disabled={saving}
              >
                <span className="settings-track-dot" aria-hidden />
                <span className="settings-track-name">{t.name}</span>
                <span className="settings-track-state">{paused ? "Paused" : "Active"}</span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
