"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type CardDetail, type Track } from "@/lib/api";

function CardsContent() {
  const searchParams = useSearchParams();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [cards, setCards] = useState<CardDetail[]>([]);
  const [trackFilter, setTrackFilter] = useState(searchParams.get("track") ?? "");
  const [selected, setSelected] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="empty">Loading cards…</div>;

  return (
    <>
      <header className="roadmap-strip">
        <div className="roadmap-strip-left">
          <h1 className="roadmap-title">Cards</h1>
          <span className="roadmap-summary">{cards.length} cards</span>
        </div>
      </header>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", gap: "1rem", flexWrap: "wrap" }}>
        <label style={{ flex: 1, maxWidth: "340px", margin: 0 }}>
          Filter by track
          <select value={trackFilter} onChange={(e) => { setTrackFilter(e.target.value); setSelected(null); }}>
            <option value="">All tracks</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <div className="muted" style={{ fontFamily: "var(--mono)", fontSize: "0.75rem" }}>
          {cards.length} cards
        </div>
      </div>

      <div className={`cards-layout ${selected ? "split" : ""}`}>
        <div className="card-list">
          {cards.length === 0 ? (
            <div className="empty">No cards found.</div>
          ) : (
            cards.map((card) => (
              <div
                key={card.id}
                className="list-item"
                style={{
                  cursor: "pointer",
                  borderColor: selected?.id === card.id ? "var(--amber)" : undefined,
                }}
                onClick={() => setSelected(card)}
              >
                <h3>{card.material_title}</h3>
                <div className="meta-row">
                  <span className="badge track">
                    <span className="dot" style={{ background: card.track_color }} />
                    {card.track_name}
                  </span>
                  <span className="badge">{card.state}</span>
                  <span className="badge">R {card.reps} · L {card.lapses}</span>
                </div>
                <div className="fsrs-meta">
                  <span>S {card.stability.toFixed(1)}d</span>
                  <span>D {card.difficulty.toFixed(1)}</span>
                  <span>{(card.retrievability * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))
          )}
        </div>

        {selected && (
          <div className="panel">
            <h2>{selected.material_title}</h2>
            {selected.material_content && (
              <pre className="content-block">{selected.material_content}</pre>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem 1rem", fontFamily: "var(--mono)", fontSize: "0.8rem", color: "var(--text-soft)", marginBottom: "1.25rem" }}>
              <span>State</span><span>{selected.state}</span>
              <span>Stability</span><span>{selected.stability.toFixed(2)} d</span>
              <span>Difficulty</span><span>{selected.difficulty.toFixed(2)}</span>
              <span>Retrievability</span><span>{(selected.retrievability * 100).toFixed(1)}%</span>
              <span>Reps · Lapses</span><span>{selected.reps} · {selected.lapses}</span>
              <span>Due</span><span>{new Date(selected.due_at).toLocaleString()}</span>
            </div>
            {selected.review_logs.length > 0 ? (
              <>
                <h2 style={{ marginTop: "1rem" }}>History</h2>
                <div className="card-list">
                  {selected.review_logs.map((log) => (
                    <div key={log.id} className="list-item" style={{ padding: "0.5rem 0.85rem" }}>
                      <div className="meta-row">
                        <span className="badge">{log.rating}</span>
                        <span className="badge">{log.elapsed_time_seconds}s</span>
                        <span className="badge">{new Date(log.reviewed_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted">No reviews yet.</p>
            )}
            <button className="ghost" onClick={() => setSelected(null)} style={{ marginTop: "1rem" }}>
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function CardsPage() {
  return (
    <Suspense fallback={<div className="empty">Loading…</div>}>
      <CardsContent />
    </Suspense>
  );
}
