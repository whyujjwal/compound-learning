"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, type ScheduleBlock, type Track, type WeeklySchedule, type WeekdayKey } from "@/lib/api";
import { trackAccent } from "@/lib/trackColors";
import { useShell } from "@/components/ui/Shell";

const DAYS: { key: WeekdayKey; label: string; short: string }[] = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

const EMPTY_WEEK: WeeklySchedule = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

const COLORS = ["#22c55e", "#0ea5e9", "#e8a849", "#f97316", "#14b8a6", "#ef4444", "#8b5cf6"];

function normalizeSchedule(schedule: WeeklySchedule): WeeklySchedule {
  const next = { ...EMPTY_WEEK } as WeeklySchedule;
  for (const day of DAYS) {
    next[day.key] = (schedule[day.key] ?? []).map((block, index) => ({
      block: index + 1,
      track: block.track,
      minutes: block.minutes ?? null,
      track_name: block.track_name ?? null,
    }));
  }
  return next;
}

function autoSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function labelForTrack(slug: string, tracksBySlug: Record<string, Track>) {
  if (slug === "review") return "Review pass";
  return tracksBySlug[slug]?.name ?? slug;
}

export default function SchedulePage() {
  const { tracks, reloadAll, setRightPanel } = useShell();
  const [schedule, setSchedule] = useState<WeeklySchedule>(EMPTY_WEEK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [creatingTrack, setCreatingTrack] = useState(false);

  useEffect(() => {
    setRightPanel(null);
    return () => setRightPanel(null);
  }, [setRightPanel]);

  useEffect(() => {
    let cancelled = false;
    api
      .getWeeklySchedule()
      .then((data) => {
        if (!cancelled) setSchedule(normalizeSchedule(data));
      })
      .catch(() => {
        if (!cancelled) setSchedule(EMPTY_WEEK);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tracksBySlug = useMemo(
    () => Object.fromEntries(tracks.map((track) => [track.slug, track])),
    [tracks]
  );

  const totalBlocks = DAYS.reduce((sum, day) => sum + schedule[day.key].length, 0);
  const totalMinutes = DAYS.reduce(
    (sum, day) =>
      sum + schedule[day.key].reduce((daySum, block) => daySum + (block.minutes ?? 0), 0),
    0
  );

  function updateDay(day: WeekdayKey, updater: (blocks: ScheduleBlock[]) => ScheduleBlock[]) {
    setSchedule((current) =>
      normalizeSchedule({
        ...current,
        [day]: updater(current[day] ?? []),
      })
    );
    setMessage(null);
  }

  function addBlock(day: WeekdayKey, track = tracks[0]?.slug ?? "review") {
    updateDay(day, (blocks) => [
      ...blocks,
      { block: blocks.length + 1, track, minutes: 45 },
    ]);
  }

  function updateBlock(day: WeekdayKey, index: number, patch: Partial<ScheduleBlock>) {
    updateDay(day, (blocks) =>
      blocks.map((block, i) => (i === index ? { ...block, ...patch } : block))
    );
  }

  function moveBlock(day: WeekdayKey, index: number, direction: -1 | 1) {
    updateDay(day, (blocks) => {
      const target = index + direction;
      if (target < 0 || target >= blocks.length) return blocks;
      const next = [...blocks];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeBlock(day: WeekdayKey, index: number) {
    updateDay(day, (blocks) => blocks.filter((_, i) => i !== index));
  }

  async function saveSchedule() {
    setSaving(true);
    setMessage(null);
    try {
      await api.setWeeklySchedule(normalizeSchedule(schedule));
      await reloadAll();
      setMessage("Week saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save week.");
    } finally {
      setSaving(false);
    }
  }

  async function createTrack(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreatingTrack(true);
    setMessage(null);
    try {
      const track = await api.createTrack({
        slug: autoSlug(newName),
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        color: newColor,
      });
      await reloadAll();
      setNewName("");
      setNewDescription("");
      setNewColor(COLORS[(COLORS.indexOf(newColor) + 1) % COLORS.length]);
      setMessage(`${track.name} created. Add it to any day.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create track.");
    } finally {
      setCreatingTrack(false);
    }
  }

  async function importExamples() {
    setSaving(true);
    setMessage(null);
    try {
      const result = await api.importExampleCurriculum();
      const next = await api.getWeeklySchedule();
      setSchedule(normalizeSchedule(next));
      await reloadAll();
      setMessage(
        `Imported examples: ${result.tracks_created} tracks, ${result.materials_created} materials.`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not import examples.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="week-canvas">
      <header className="week-canvas-head">
        <div>
          <p className="page-kicker">Blank canvas</p>
          <h1 className="page-title">Weekly calendar</h1>
          <p className="page-sub">
            Build the week out of learning blocks. Repeat tracks, add review passes,
            or leave days open.
          </p>
        </div>
        <div className="week-canvas-actions">
          <Link href="/curriculum/build" className="v2-btn ghost">
            Build with AI
          </Link>
          <button type="button" className="v2-btn ghost" onClick={importExamples} disabled={saving}>
            Import examples
          </button>
          <button type="button" className="v2-btn primary" onClick={saveSchedule} disabled={saving}>
            {saving ? "Saving..." : "Save week"}
          </button>
        </div>
      </header>

      <section className="week-canvas-summary" aria-label="Week summary">
        <div>
          <strong>{tracks.length}</strong>
          <span>tracks</span>
        </div>
        <div>
          <strong>{totalBlocks}</strong>
          <span>weekly blocks</span>
        </div>
        <div>
          <strong>{totalMinutes || "-"}</strong>
          <span>planned minutes</span>
        </div>
      </section>

      {message && <p className="week-canvas-message">{message}</p>}

      <div className="week-canvas-layout">
        <section className="week-board" aria-label="Editable weekly schedule">
          {DAYS.map((day) => (
            <article key={day.key} className="week-day-column">
              <header className="week-day-head">
                <div>
                  <span className="week-day-short">{day.short}</span>
                  <h2>{day.label}</h2>
                </div>
                <button type="button" className="week-icon-btn" onClick={() => addBlock(day.key)}>
                  +
                </button>
              </header>

              <div className="week-block-list">
                {loading ? (
                  <p className="week-empty">Loading...</p>
                ) : schedule[day.key].length === 0 ? (
                  <button type="button" className="week-empty add" onClick={() => addBlock(day.key)}>
                    Add block
                  </button>
                ) : (
                  schedule[day.key].map((block, index) => {
                    const accent =
                      block.track === "review"
                        ? "#94a3b8"
                        : trackAccent(block.track, tracksBySlug[block.track]?.color);
                    return (
                      <div
                        key={`${day.key}-${index}-${block.track}`}
                        className="week-block"
                        style={{ ["--track-color" as string]: accent }}
                      >
                        <div className="week-block-top">
                          <span className="week-block-number">{index + 1}</span>
                          <select
                            value={block.track}
                            onChange={(e) => updateBlock(day.key, index, { track: e.target.value })}
                          >
                            {tracks.map((track) => (
                              <option key={track.id} value={track.slug}>
                                {track.name}
                              </option>
                            ))}
                            <option value="review">Review pass</option>
                          </select>
                        </div>
                        <div className="week-block-bottom">
                          <label>
                            <span>Minutes</span>
                            <input
                              type="number"
                              min={5}
                              max={480}
                              step={5}
                              value={block.minutes ?? 45}
                              onChange={(e) =>
                                updateBlock(day.key, index, { minutes: Number(e.target.value) })
                              }
                            />
                          </label>
                          <div className="week-block-tools">
                            <button
                              type="button"
                              className="week-icon-btn"
                              onClick={() => moveBlock(day.key, index, -1)}
                              disabled={index === 0}
                              title="Move earlier"
                            >
                              ^
                            </button>
                            <button
                              type="button"
                              className="week-icon-btn"
                              onClick={() => moveBlock(day.key, index, 1)}
                              disabled={index === schedule[day.key].length - 1}
                              title="Move later"
                            >
                              v
                            </button>
                            <button
                              type="button"
                              className="week-icon-btn danger"
                              onClick={() => removeBlock(day.key, index)}
                              title="Remove"
                            >
                              x
                            </button>
                          </div>
                        </div>
                        <p className="week-block-caption">
                          {labelForTrack(block.track, tracksBySlug)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </article>
          ))}
        </section>

        <aside className="week-track-panel">
          <section className="week-panel-section">
            <h2>Create a track</h2>
            <form onSubmit={createTrack} className="week-track-form">
              <label>
                <span>Name</span>
                <input
                  className="v2-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Product Engineering"
                  required
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  className="v2-input"
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="The focus, outcome, or roadmap theme."
                />
              </label>
              <div className="week-color-row" role="radiogroup" aria-label="Track color">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`week-color${newColor === color ? " active" : ""}`}
                    style={{ background: color }}
                    onClick={() => setNewColor(color)}
                    aria-label={color}
                  />
                ))}
              </div>
              <button type="submit" className="v2-btn primary" disabled={creatingTrack}>
                {creatingTrack ? "Creating..." : "Create track"}
              </button>
            </form>
          </section>

          <section className="week-panel-section">
            <h2>Tracks</h2>
            {tracks.length === 0 ? (
              <p className="week-panel-empty">
                Start from your own track, generate a roadmap, or import the four examples.
              </p>
            ) : (
              <div className="week-track-list">
                {tracks.map((track) => (
                  <Link
                    key={track.id}
                    href={`/track/${track.slug}`}
                    className="week-track-pill"
                    style={{ ["--track-color" as string]: trackAccent(track.slug, track.color) }}
                  >
                    <span aria-hidden />
                    {track.name}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
