"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useShell } from "@/components/ui/Shell";
import { trackAccent } from "@/lib/trackColors";
import { api, type CardDetail, type Track } from "@/lib/api";

function CardsContent() {
  const { setRightPanel } = useShell();
  const searchParams = useSearchParams();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [cards, setCards] = useState<CardDetail[]>([]);
  const [trackFilter, setTrackFilter] = useState(searchParams.get("track") ?? "");
  const [selected, setSelected] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRightPanel(null);
    return () => setRightPanel(null);
  }, [setRightPanel]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const t = await api.getTracks();
      setTracks(t);
      const filter = trackFilter || undefined;
      setCards(await api.getCards(filter));
      setLoading(false);
    }
    load();
  }, [trackFilter]);

  if (loading) return <p style={{ color: "var(--fg-mute)" }}>Loading cards…</p>;

  const trackMap = Object.fromEntries(tracks.map((t) => [t.id, t]));

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Library · Cards</h1>
          <p className="page-sub">{cards.length} cards</p>
        </div>
      </header>

      <div className="lib-bar">
        <div className="field">
          <span className="field-label">Filter by track</span>
          <select
            value={trackFilter}
            onChange={(e) => {
              setTrackFilter(e.target.value);
              setSelected(null);
            }}
          >
            <option value="">All tracks</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={`lib-cards-layout${selected ? " split" : ""}`}>
        <div>
          {cards.length === 0 ? (
            <p style={{ color: "var(--fg-mute)" }}>No cards found.</p>
          ) : (
            cards.map((card) => {
              const trackId = card.track_id;
              const track = trackMap[trackId];
              const accent = track
                ? trackAccent(track.slug, card.track_color)
                : trackAccent("", card.track_color);
              const isSelected = selected?.id === card.id;
              return (
                <article
                  key={card.id}
                  className="lib-row"
                  style={{
                    ["--track-color" as string]: accent,
                    cursor: "pointer",
                    borderColor: isSelected ? accent : undefined,
                  }}
                  onClick={() => setSelected(card)}
                >
                  <div>
                    <div className="lib-row-title">{card.material_title}</div>
                    <div className="lib-row-meta">
                      <span className="pill track">
                        <span className="track-dot" aria-hidden /> {card.track_name}
                      </span>
                      <span className="pill muted">{card.state}</span>
                      <span className="pill muted">
                        R{card.reps} · L{card.lapses}
                      </span>
                      <span className="pill muted">
                        S {card.stability.toFixed(1)}d
                      </span>
                      <span className="pill muted">
                        {(card.retrievability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {selected && (
          <aside className="card-detail">
            <h2>{selected.material_title}</h2>
            {selected.material_content && (
              <pre className="card-detail-content">{selected.material_content}</pre>
            )}
            <div className="card-detail-grid">
              <span>State</span><span>{selected.state}</span>
              <span>Stability</span><span>{selected.stability.toFixed(2)} d</span>
              <span>Difficulty</span><span>{selected.difficulty.toFixed(2)}</span>
              <span>Retrievability</span><span>{(selected.retrievability * 100).toFixed(1)}%</span>
              <span>Reps · Lapses</span><span>{selected.reps} · {selected.lapses}</span>
              <span>Due</span><span>{new Date(selected.due_at).toLocaleDateString()}</span>
            </div>
            {selected.review_logs.length > 0 ? (
              <>
                <h2 style={{ marginTop: 16 }}>History</h2>
                {selected.review_logs.map((log) => (
                  <div key={log.id} className="lib-row-meta" style={{ marginBottom: 6 }}>
                    <span className="pill">{log.rating}</span>
                    <span className="pill muted">{log.elapsed_time_seconds}s</span>
                    <span className="pill muted">
                      {new Date(log.reviewed_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <p style={{ color: "var(--fg-mute)" }}>No reviews yet.</p>
            )}
            <button
              type="button"
              className="v2-btn ghost sm"
              onClick={() => setSelected(null)}
              style={{ marginTop: 12 }}
            >
              Close
            </button>
          </aside>
        )}
      </div>
    </>
  );
}

export default function CardsPage() {
  return (
    <Suspense fallback={<p style={{ color: "var(--fg-mute)" }}>Loading…</p>}>
      <CardsContent />
    </Suspense>
  );
}
