"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useShell } from "@/components/ui/Shell";
import { RightPanel, PanelSection } from "@/components/ui/RightPanel";
import { trackAccent } from "@/lib/trackColors";
import { api, type Material, type QueueItem, type TrackProgress } from "@/lib/api";

export default function TrackPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const router = useRouter();
  const { tracks, setRightPanel, setActions } = useShell();

  const [progress, setProgress] = useState<TrackProgress | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);

  const track = tracks.find((t) => t.slug === slug);
  const accent = trackAccent(slug, track?.color);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    Promise.all([
      api.getTrackProgress(slug).catch(() => null),
      track ? api.getMaterials(track.id).catch(() => []) : Promise.resolve([]),
    ]).then(([p, m]) => {
      if (cancelled) return;
      setProgress(p);
      setMaterials(m);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, track]);

  const startSession = useCallback(
    async (count = 5) => {
      setPulling(true);
      try {
        const items: QueueItem[] = await api.getExtraQueue(slug, count, []);
        if (items.length === 0) return;
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "compound:session-queue",
            JSON.stringify({
              ts: Date.now(),
              context: track?.name ?? "Track",
              items,
            })
          );
        }
        router.push(`/session/${items[0].card_id}`);
      } finally {
        setPulling(false);
      }
    },
    [slug, track, router]
  );

  // Right panel
  useEffect(() => {
    setRightPanel(
      <RightPanel>
        {progress && (
          <>
            <PanelSection label="Progress">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="stat">
                  <span className="stat-num">
                    {progress.materials_total
                      ? Math.round((progress.materials_mastered / progress.materials_total) * 100)
                      : 0}
                    %
                  </span>
                  <span className="stat-label">mastered</span>
                  <span className="stat-hint">
                    {progress.materials_mastered} of {progress.materials_total} ·{" "}
                    {progress.materials_started} started
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-num">{progress.due_reviews}</span>
                  <span className="stat-label">reviews queued</span>
                </div>
                <div className="stat">
                  <span className="stat-num">
                    {Math.round((progress.avg_retrievability || 0) * 100)}%
                  </span>
                  <span className="stat-label">avg recall</span>
                </div>
              </div>
            </PanelSection>
            <PanelSection label="Recent materials">
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
                {materials.slice(0, 6).map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "var(--fg-soft)",
                      gap: 8,
                    }}
                  >
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.title}
                    </span>
                    <span
                      className="pill muted"
                      style={{ flexShrink: 0, fontSize: 9.5 }}
                    >
                      {m.estimated_minutes}m
                    </span>
                  </div>
                ))}
              </div>
            </PanelSection>
          </>
        )}
      </RightPanel>
    );
    return () => setRightPanel(null);
  }, [progress, materials, setRightPanel]);

  // Cmdk action: start session from this track
  useEffect(() => {
    setActions({
      onStartFirstBlock: () => startSession(8),
      onPushMore: (s) => startSession(5),
    });
    return () => setActions({});
  }, [setActions, startSession]);

  if (!track && !loading) {
    return (
      <div className="empty-today">
        <h2 className="empty-today-title">Track not found.</h2>
        <p className="empty-today-sub">
          <Link href="/curriculum">Back to roadmap</Link>
        </p>
      </div>
    );
  }

  const pctMastered =
    progress && progress.materials_total
      ? progress.materials_mastered / progress.materials_total
      : 0;
  const pctStarted =
    progress && progress.materials_total
      ? progress.materials_started / progress.materials_total
      : 0;

  return (
    <>
      <header className="track-hero" style={{ ["--track-color" as string]: accent }}>
        <div className="track-hero-eyebrow">
          <span className="track-dot" aria-hidden /> Track ·{" "}
          {progress?.materials_total ?? track?.material_count ?? 0} materials
        </div>
        <h1 className="track-hero-name">{progress?.name ?? track?.name}</h1>
        {track?.description && <p className="track-hero-desc">{track.description}</p>}

        <div className="track-hero-row">
          <div className="track-progress">
            <div className="track-progress-bar">
              <span
                className="track-progress-bar-started"
                style={{ width: `${pctStarted * 100}%` }}
              />
              <span
                className="track-progress-bar-mastered"
                style={{ width: `${pctMastered * 100}%` }}
              />
            </div>
            <div className="track-progress-stats">
              <span>{progress?.materials_started ?? 0} started</span>
              <span>{progress?.materials_mastered ?? 0} mastered</span>
              <span>{progress?.due_reviews ?? 0} reviews queued</span>
            </div>
          </div>
          <div className="track-cta">
            <button
              type="button"
              className="v2-btn primary"
              onClick={() => startSession()}
              disabled={pulling}
              style={{ background: accent, color: "#0a0a0d" }}
            >
              {pulling
                ? "Loading…"
                : progress?.next_material_title
                ? "Continue →"
                : "Start track →"}
            </button>
          </div>
        </div>

        {progress?.next_material_title && (
          <div style={{ fontSize: 13, color: "var(--fg-mute)" }}>
            Next: <span style={{ color: "var(--fg-soft)" }}>{progress.next_material_title}</span>
            {progress.next_block_label && <span> · {progress.next_block_label}</span>}
          </div>
        )}
      </header>

      {progress && progress.blocks.length > 0 && (
        <>
          <div className="track-section-label">Blocks</div>
          <div className="track-blocks" style={{ ["--track-color" as string]: accent }}>
            {progress.blocks.map((b) => {
              const pctM = b.material_count ? b.mastered_count / b.material_count : 0;
              const pctS = b.material_count ? b.started_count / b.material_count : 0;
              return (
                <div className="track-block" key={b.label}>
                  <div className="track-block-title">
                    <span>{b.label}</span>
                    <span className="track-block-meta">
                      {b.started_count}/{b.material_count} started · {b.mastered_count} mastered
                    </span>
                  </div>
                  <div className="track-block-bar">
                    <span
                      className="track-block-bar-started"
                      style={{ width: `${pctS * 100}%` }}
                    />
                    <span
                      className="track-block-bar-mastered"
                      style={{ width: `${pctM * 100}%` }}
                    />
                  </div>
                  <div className="track-block-pct">{Math.round(pctM * 100)}%</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
