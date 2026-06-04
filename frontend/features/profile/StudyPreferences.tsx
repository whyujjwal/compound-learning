"use client";

import { Field, Input, Select, Skeleton, Badge } from "@/components/primitives";
import { useTheme } from "@/components/ThemeProvider";

/* ─── Theme toggle button ────────────────────────────────────── */
function ThemeToggleButton() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        fontSize: 13,
        fontWeight: 500,
        color: "var(--text)",
        background: "var(--overlay-hover)",
        border: "1px solid var(--hairline)",
        borderRadius: 6,
        cursor: "pointer",
        transition: "background 100ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-active)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)";
      }}
    >
      {isLight ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M8.44 1.5a.75.75 0 0 0-1.06 0 5.25 5.25 0 0 0 0 7.42.75.75 0 0 0 1.06-1.06 3.75 3.75 0 0 1 0-5.3.75.75 0 0 0 0-1.06ZM7.5 1.05a6.75 6.75 0 1 0 7.45 7.45.75.75 0 1 0-1.5-.17 5.25 5.25 0 1 1-5.78-5.78.75.75 0 0 0-.17-1.5Z" fill="currentColor"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M8 1.5a.75.75 0 0 1 .75.75v1.25a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 8 1.5ZM8 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.25 8a.75.75 0 0 1 .75-.75h1.25a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75Zm9.25-.75a.75.75 0 0 1 0 1.5h1.25a.75.75 0 0 1 0-1.5H11.5ZM3.63 3.63a.75.75 0 0 1 1.06 0l.88.88a.75.75 0 1 1-1.06 1.06l-.88-.88a.75.75 0 0 1 0-1.06Zm8.19 8.19a.75.75 0 0 1 1.06 0l.88.88a.75.75 0 0 1-1.06 1.06l-.88-.88a.75.75 0 0 1 0-1.06ZM3.63 12.37a.75.75 0 0 1 0-1.06l.88-.88a.75.75 0 1 1 1.06 1.06l-.88.88a.75.75 0 0 1-1.06 0Zm8.19-8.19a.75.75 0 0 1 0-1.06l.88-.88a.75.75 0 1 1 1.06 1.06l-.88.88a.75.75 0 0 1-1.06 0ZM12.25 8a.75.75 0 0 1 .75-.75H14a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1-.75-.75ZM8 12.25a.75.75 0 0 1 .75.75V14a.75.75 0 0 1-1.5 0v-1a.75.75 0 0 1 .75-.75Z" fill="currentColor"/>
        </svg>
      )}
      {isLight ? "Dark mode" : "Light mode"}
    </button>
  );
}

/* ─── Retention slider ───────────────────────────────────────── */
function RetentionSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 90 ? "var(--ok)" : pct >= 80 ? "var(--warn)" : "var(--bad)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Track + thumb */}
      <div style={{ position: "relative", paddingBottom: 4 }}>
        <input
          type="range"
          min={0.7}
          max={0.99}
          step={0.01}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          aria-label={`Target retention: ${pct}%`}
          style={{
            width: "100%",
            accentColor: "var(--accent)",
            cursor: disabled ? "not-allowed" : "pointer",
            height: 4,
          }}
        />
      </div>
      {/* Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>70%</div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {pct}%
          <Badge color={pct >= 90 ? "success" : pct >= 80 ? "warn" : "error"} style={{ fontSize: 11 }}>
            {pct >= 90 ? "high" : pct >= 80 ? "medium" : "low"}
          </Badge>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>99%</div>
      </div>
    </div>
  );
}

/* ─── Track toggle chip ──────────────────────────────────────── */
function TrackToggle({
  name,
  color,
  paused,
  onToggle,
  disabled,
}: {
  name: string;
  color: string;
  paused: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const dotColor = color?.startsWith("#") ? color : "var(--accent)";
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={!paused}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 6,
        border: "1px solid var(--hairline)",
        background: paused ? "transparent" : "var(--accent-soft)",
        color: paused ? "var(--muted)" : "var(--text)",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13,
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        transition: "background 150ms, color 150ms, border-color 150ms",
        textAlign: "left",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: paused ? "var(--muted)" : dotColor,
          flexShrink: 0,
          transition: "background 150ms",
        }}
      />
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name}
      </span>
      <span style={{ fontSize: 11, color: paused ? "var(--bad)" : "var(--ok)", fontWeight: 600, letterSpacing: "0.04em" }}>
        {paused ? "Paused" : "Active"}
      </span>
    </button>
  );
}

/* ─── Props ─────────────────────────────────────────────────── */
interface StudyPreferencesProps {
  loading: boolean;
  // editable state
  retention: number;
  blockMinutes: number;
  dailyNewCards: number;
  pausedTracks: string[];
  // tracks from library (for toggle grid)
  tracks: { slug: string; name: string; color: string }[];
  // callbacks
  onRetentionChange: (v: number) => void;
  onBlockMinutesChange: (v: number) => void;
  onDailyNewCardsChange: (v: number) => void;
  onToggleTrack: (slug: string) => void;
  saving: boolean;
}

/* ─── Component ─────────────────────────────────────────────── */
export function StudyPreferences({
  loading,
  retention,
  blockMinutes,
  dailyNewCards,
  pausedTracks,
  tracks,
  onRetentionChange,
  onBlockMinutesChange,
  onDailyNewCardsChange,
  onToggleTrack,
  saving,
}: StudyPreferencesProps) {
  const activeCount = tracks.length - pausedTracks.length;
  const allPaused = tracks.length > 0 && activeCount === 0;

  /* ── Study budget row ── */
  const budgetRow = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
      <Field label="Daily study block" htmlFor="block-minutes" hint="Maximum minutes per session">
        {loading ? (
          <Skeleton height={34} />
        ) : (
          <Input
            id="block-minutes"
            type="number"
            min={15}
            max={480}
            step={5}
            value={blockMinutes}
            onChange={(e) => onBlockMinutesChange(Number(e.target.value))}
            disabled={saving}
          />
        )}
      </Field>

      <Field
        label="New-card cap"
        htmlFor="daily-new"
        hint={dailyNewCards === 0 ? "Unlimited — FSRS decides" : `${dailyNewCards} new cards per day`}
      >
        {loading ? (
          <Skeleton height={34} />
        ) : (
          <Select
            id="daily-new"
            value={dailyNewCards}
            onChange={(e) => onDailyNewCardsChange(Number(e.target.value))}
            disabled={saving}
          >
            <option value={0}>Unlimited</option>
            <option value={5}>5 / day</option>
            <option value={10}>10 / day</option>
            <option value={20}>20 / day</option>
            <option value={30}>30 / day</option>
            <option value={50}>50 / day</option>
            <option value={100}>100 / day</option>
            {/* Preserve exact value if not in list */}
            {![0, 5, 10, 20, 30, 50, 100].includes(dailyNewCards) && dailyNewCards > 0 && (
              <option value={dailyNewCards}>{dailyNewCards} / day</option>
            )}
          </Select>
        )}
      </Field>
    </div>
  );

  /* ── Retention slider ── */
  const retentionRow = (
    <Field label="Target retention" htmlFor="retention-slider" hint="Higher retention = more reviews; lower = faster coverage">
      {loading ? (
        <Skeleton height={34} />
      ) : (
        <RetentionSlider
          value={retention}
          onChange={onRetentionChange}
          disabled={saving}
        />
      )}
    </Field>
  );

  /* ── Track toggles ── */
  const trackSection = tracks.length > 0 ? (
    <div style={{ marginTop: 28 }}>
      {/* Sub-header */}
      <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 20, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Track availability
          </span>
          <Badge color={allPaused ? "error" : "muted"}>
            {activeCount} active · {pausedTracks.length} paused
          </Badge>
        </div>
        {allPaused && (
          <p style={{ fontSize: 13, color: "var(--warn)", marginTop: 8 }}>
            All tracks are paused — today&apos;s queue will be empty.
          </p>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 8,
        }}
      >
        {tracks.map((t) => (
          <TrackToggle
            key={t.slug}
            name={t.name}
            color={t.color}
            paused={pausedTracks.includes(t.slug)}
            onToggle={() => onToggleTrack(t.slug)}
            disabled={saving}
          />
        ))}
      </div>
    </div>
  ) : null;

  /* ── Appearance ── */
  const appearanceRow = (
    <div style={{ marginTop: 28, borderTop: "1px solid var(--hairline)", paddingTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 2,
            }}
          >
            Appearance
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Toggle between light and dark mode
          </div>
        </div>
        <ThemeToggleButton />
      </div>
    </div>
  );

  return (
    <div>
      {budgetRow}
      {retentionRow}
      {trackSection}
      {appearanceRow}
    </div>
  );
}
