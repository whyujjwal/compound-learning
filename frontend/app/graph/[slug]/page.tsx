"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type GraphNode, type KnowledgeGraph } from "@/lib/api";
import { trackAccent } from "@/lib/trackColors";

export default function KnowledgeGraphPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "dsa";
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [leeches, setLeeches] = useState<GraphNode[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getKnowledgeGraph(slug), api.getLeeches()])
      .then(([g, l]) => {
        setGraph(g);
        setLeeches(l.filter((n) => n.is_leech));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load graph"));
  }, [slug]);

  if (error) return <p style={{ color: "var(--danger)" }}>{error}</p>;
  if (!graph) return <p style={{ color: "var(--fg-mute)" }}>Loading knowledge graph…</p>;

  const accent = trackAccent(graph.track_slug, "#c49a6c");

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title" style={{ color: accent }}>
          {graph.track_name} · Knowledge Graph
        </h1>
        <p className="page-sub">
          {graph.nodes.length} materials · {graph.edges.length} prerequisite links
        </p>
      </header>

      {leeches.length > 0 && (
        <section className="card" style={{ marginBottom: 24 }}>
          <h2 className="card-title">Leeches ({leeches.length})</h2>
          <p className="card-sub">Cards with 5+ lapses — need extra attention.</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {leeches.slice(0, 8).map((n) => (
              <li key={n.id}>
                {n.title} <span className="pill muted">{n.lapses} lapses</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="graph-grid">
        {graph.nodes.map((node) => {
          const href = node.card_id
            ? `/session/${node.card_id}`
            : `/materials?track=${graph.track_slug}`;
          return (
          <Link
            key={node.id}
            href={href}
            className={`graph-node${node.mastered ? " mastered" : ""}${node.is_leech ? " leech" : ""}`}
          >
            <span className="graph-node-seq">{node.sequence}</span>
            <span className="graph-node-title">{node.title}</span>
            {node.block_label && <span className="graph-node-block">{node.block_label}</span>}
            <span className="graph-node-status">
              {node.mastered ? "✓ mastered" : node.started ? "in progress" : "new"}
            </span>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
